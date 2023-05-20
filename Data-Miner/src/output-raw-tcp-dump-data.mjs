"use strict";

/**
 * Module: output-raw-tcp-dump-data.mjs
 */

// Importing things...
import { parentPort } from "node:worker_threads";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// Transform the shell code execution function to return a promise (now we can await for it's completion)
const promisifiedExec = promisify(exec);

/**
 * Function to read `tcpdump` files and output the data to a `txt` file
 * 
 * @param {string} fileUrl
 * @param {string} day What day is currently assigned to process
 * @returns {Promise<string>} Output file url
 */
export async function outputRawTcpDumpData(fileUrl, day) {
  // Message for identifying what file the thread is processing
  parentPort.postMessage({
    message: `Now processing: ${fileUrl}...`,
  });

  // Create the output file path and the command to execute
  const filteredDataFilePath = `./parsed-data/${day}.txt`;
  const bashCommand = `tshark -r ${fileUrl} -T fields -e frame.time_epoch -e frame.len > ${filteredDataFilePath}`;
  
  // Try to execute our command, awaiting for it's completion and posting a message to the main thread when done.
  // Then return the filtered data file path :D
  try {
    await promisifiedExec(bashCommand);

    parentPort.postMessage({
      message: `${day} file done!`,
    });

    return filteredDataFilePath;
  } catch (error) {
    // If error, throw it!
    console.error(error);
    parentPort.close();
  }
}
