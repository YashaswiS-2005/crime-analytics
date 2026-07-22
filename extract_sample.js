const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = path.join(__dirname, 'Predictive Crime Analytics-20240328T133800Z-002', 'Predictive Crime Analytics', 'FIR_Details_Data.csv');
const outputFile = path.join(__dirname, 'training_dataset.csv');

async function processCSV() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const outStream = fs.createWriteStream(outputFile);
  
  let count = 0;
  const maxRows = 10000;

  for await (const line of rl) {
    outStream.write(line + '\n');
    count++;
    if (count > maxRows) {
      break;
    }
  }
  
  outStream.end();
  console.log(`Created ${outputFile} with ${count} rows.`);
}

processCSV().catch(console.error);
