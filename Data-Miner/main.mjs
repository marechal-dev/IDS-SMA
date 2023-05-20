"use strict";

// Library Imports (no 3rd party libs, only native code 😎)
import { isMainThread, Worker, workerData } from "node:worker_threads";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url";

import { outputRawTcpDumpData } from "./src/output-raw-tcp-dump-data.mjs";
import { predictNextWindow } from "./src/predict-next-window.mjs";
import { roundTimestamp } from "./src/round-timestamp.mjs";

// Get the current file name
const __filename = fileURLToPath(import.meta.url);

// Instanciate our threads via the main thread
if (isMainThread) {
  const mondayWorker = new Worker(__filename, {
    workerData: {
      fileUrl: "./raw-data/monday.inside.tcpdump",
      destinationFileUrl: "./parsed-data/monday.predicted.csv",
      day: "monday",
    }
  });

  const tuesdayWorker = new Worker(__filename, {
    workerData: {
      fileUrl: "./raw-data/tuesday.inside.tcpdump",
      destinationFileUrl: "./parsed-data/tuesday.predicted.csv",
      day: "tuesday",
    }
  });

  const wednesdayWorker = new Worker(__filename, {
    workerData: {
      fileUrl: "./raw-data/wednesday.inside.tcpdump",
      destinationFileUrl: "./parsed-data/wednesday.predicted.csv",
      day: "wednesday",
    }
  });

  const thursdayWorker = new Worker(__filename, {
    workerData: {
      fileUrl: "./raw-data/thursday.inside.tcpdump",
      destinationFileUrl: "./parsed-data/thursday.predicted.csv",
      day: "thursday",
    }
  });

  const fridayWorker = new Worker(__filename, {
    workerData: {
      fileUrl: "./raw-data/friday.inside.tcpdump",
      destinationFileUrl: "./parsed-data/friday.predicted.csv",
      day: "friday",
    }
  });

  // Add event listeners to any messages, errors and completion
  mondayWorker.on('message', (message) => console.log(message));
  tuesdayWorker.on('message', (message) => console.log(message));
  wednesdayWorker.on('message', (message) => console.log(message));
  thursdayWorker.on('message', (message) => console.log(message));
  fridayWorker.on('message', (message) => console.log(message));

  mondayWorker.on('error', (error) => console.error(error));
  tuesdayWorker.on('error', (error) => console.error(error));
  wednesdayWorker.on('error', (error) => console.error(error));
  thursdayWorker.on('error', (error) => console.error(error));
  fridayWorker.on('error', (error) => console.error(error));

  mondayWorker.on('exit', (exitCode) => console.log(`Monday Worker Thread exited with code ${exitCode}`));
  tuesdayWorker.on('exit', (exitCode) => console.log(`Tuesday Worker Thread exited with code ${exitCode}`));
  wednesdayWorker.on('exit', (exitCode) => console.log(`Wednesday Worker Thread exited with code ${exitCode}`));
  thursdayWorker.on('exit', (exitCode) => console.log(`Thursday Worker Thread exited with code ${exitCode}`));
  fridayWorker.on('exit', (exitCode) => console.log(`Friday Worker Thread exited with code ${exitCode}`));
} else {
  // This is the code that will run on our threads!
  // workerData is the data passed to our threads on initialization
  const { fileUrl, destinationFileUrl, day } = workerData;

  // Await for filtering and outputting our data to the file
  const filteredDataFilePath = await outputRawTcpDumpData(fileUrl, day);

  // Now, we read the generated file
  const outputFileReadStream = createReadStream(filteredDataFilePath, {
    encoding: "utf-8",
  });

  /**
   * But... we don't read it entirely, because that would cause our PC to blow up!
   * So we gonna read it line by line :D
   */
  const outputFileReadingInterface = createInterface({
    input: outputFileReadStream,
  })

  // Creating the final file write stream
  const finalFileWriteStream = createWriteStream(destinationFileUrl, {
    encoding: "utf-8",
  });

  // Setting up a dictionary to hold our parsed data
  const data = {};

  /**
   * For each line of our output file, we should split on the tab
   * and then push the values to our dictionary, in order to calculate
   * the moving average and predict the next window
   */
  for await (const line of outputFileReadingInterface) {
    const [timestamp, packetSize] = line
      .trim()
      .split("\t");
    
    // Round the timestamp
    const roundedTimestamp = roundTimestamp(Number(timestamp));
    const roundedTimestampString = String(roundedTimestamp);

    if (!(roundedTimestampString in data)) {
      data[roundedTimestampString] = {
        numberOfPackets: 1,
        packetsTotalSize: Number(packetSize),
        packetsAverage: 0,
      };

      continue;
    }

    data[roundedTimestampString].numberOfPackets += 1;
    data[roundedTimestampString].packetsTotalSize += Number(packetSize);
  }    

  // So we write the header to our csv file
  const CSV_HEADER = "timestamp;numberOfPackets;packetsTotalSize;packetsMean\n";
  finalFileWriteStream.write(CSV_HEADER);

  for (const key in data) {
    const currentTimestamp = data[key];
    currentTimestamp.packetsAverage = currentTimestamp.packetsTotalSize / currentTimestamp.numberOfPackets;

    finalFileWriteStream.write(`${key};${currentTimestamp.numberOfPackets};${currentTimestamp.packetsTotalSize};${currentTimestamp.packetsAverage}\n`);
  }

  // No memory leaks here
  outputFileReadingInterface.close();
  outputFileReadStream.close();
  finalFileWriteStream.close();
}
