export interface PrefundedAccount {
  address: string;
  amount: bigint;
}

export interface Deployment {
  vestedLock: String;
  greenMintingToken: string;
  deployer: string;
  prefundedAccounts: PrefundedAccount[];
}
