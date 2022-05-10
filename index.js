const path = require("path");
const fs = require("fs");
const Queue = require("bull");
const FormData = require("form-data");
const axios = require("axios");
const jobID = 123456;
const uploadPdf = new Queue("uploadPdf", {
  limiter: {
    max: 1,
    duration: 5000,
  },
});
const removeFileQueue = new Queue("removeFile");

fs.readdir(path.resolve(__dirname, "cv"), async (err, files) => {
  if (err) throw err;
  for (let file of files) {
    await uploadPdf.add({
      file,
    });
  }
});

uploadPdf.process(async (job) => {
  await documentUpload(job.data.file);
  return job.data.file;
});

uploadPdf.on("completed", (job, result) => {
  console.log(`Job completed with id ${job?.id} and result ${result}`);
  removeFileQueue.add({ file: result });
});

removeFileQueue.process(async (job) => {
  removeFile(job.data.file);
});

removeFileQueue.on("completed", (job, result) => {
  console.log(`File Removed with id ${job?.id}`);
  removeFileQueue.add({ file: result });
});

async function documentUpload(file) {
  try {
    const fileStream = fs.createReadStream(`./cv/${file}`);
    let formData = new FormData();

    formData.append("document", fileStream, file);

    const response = await axios.post(
      "http://localhost:8087/upload/resume",
      formData
    );
    console.log(response.data, "response data");
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

function removeFile(file) {
  fs.unlinkSync(`./cv/${file}`);
  return true;
}

// response output

// {
//     status: 'success',
//     data: {
//       id: '666078000000563059',
//       fristName: 'M.',
//       lastName: 'Samiur',
//       phone: '',
//       email: 'srsusmoy@gmail.com'
//     },
//     message: 'Fetch Completed'
//   }
