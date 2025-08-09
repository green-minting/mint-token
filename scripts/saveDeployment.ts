import { Deployment } from "./types";
import fs from "fs";

export function saveDeploymentFile(deployment: Deployment) {
  const deploymentDataFilePath = `./deployments/${buildDeploymentFileName()}`;
  const deploymentData = {
    ...deployment,
    prefundedAccounts: deployment.prefundedAccounts.map((prefunded) => ({
      address: prefunded.address,
      amount: prefunded.amount.toString(),
    })),
  };
  console.log("deployment data:", deploymentData);
  console.log("saved to:", deploymentDataFilePath);

  fs.writeFileSync(
    deploymentDataFilePath,
    JSON.stringify(deploymentData, null, 2)
  );
}

function buildDeploymentFileName() {
  const network = process.env.HARDHAT_NETWORK || "unknown";
  const date = new Date(Date.now());
  const month =
    date.getMonth() + 1 > 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`;
  const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`;
  const hour = date.getHours() > 9 ? date.getHours() : `0${date.getHours()}`;
  const minute =
    date.getMinutes() > 9 ? date.getMinutes() : `0${date.getMinutes()}`;
  const second =
    date.getSeconds() > 9 ? date.getSeconds() : `0${date.getSeconds()}`;
  const dateString = `${date.getFullYear()}-${month}-${day}_${hour}-${minute}-${second}`;
  return `${network}__${dateString}.json`;
}
