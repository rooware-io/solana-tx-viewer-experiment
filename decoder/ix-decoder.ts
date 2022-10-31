/**
 * This does not replace the idl or comprehensive decoding
 * It is a higher level representation which extracts the minimum required to grasp the operation
 *
 * TODO: Provide mapping from mint Pk to symbol
 */

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  decodeInstruction,
  isBurnInstruction,
  isMintToInstruction,
  isTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import { Cluster, getProgramName } from "../explorer-fork/tx";

type Arg = {
  name: string;
  value: string;
};

type Aoi = {
  name: string;
  account: PublicKey;
};

/**
 * Use movement from to, revert to highest level account
 * [ATA.createIdempotent] amount=3390.2794233271 [USDC], from=[feePayer], to=[USDCReserve]
 * [JupiterV4.route] blablabla amount=X []
 *     [Mercurial.exchange] amount=3390.279423327137 [USDC], from=[feePayer], to=[USDCReserve]
 *         [Token.transfer] amount=3390.279423327137 [USDC], from=[feePayer], to=[USDCReserve]
 *         [Token.transfer] amount=3390.279423327137 [SOL], from=[SOLReserve], to=[feePayer]
 *     [Mercurial.exchange] amount=3390.279423327137 [USDC], from=[feePayer], to=[USDCReserve]
 *
 */
export type HighLevelTransactionInstruction = {
  program: string;
  method: string;
  args: Arg[];
  aois: Aoi[];
};

export function asHighLevelTransactionInstruction(
  transactionIx: TransactionInstruction
): HighLevelTransactionInstruction | undefined {
  const program = getProgramName(
    transactionIx.programId.toBase58(),
    Cluster.MainnetBeta
  );
  if (transactionIx.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
    // const program = "ATA";
    let method = "";
    let aois = [
      { name: "payer", account: transactionIx.keys[0].pubkey },
      { name: "owner", account: transactionIx.keys[2].pubkey },
      { name: "mint", account: transactionIx.keys[3].pubkey },
    ];
    if (transactionIx.data.equals(Buffer.from([]))) {
      method = "create";
    } else if (transactionIx.data.equals(Buffer.from([1]))) {
      method = "createIdempotent";
    } else {
      method = "unknown";
    }

    return {
      program,
      method,
      args: [],
      aois,
    };
  } else if (transactionIx.programId.equals(TOKEN_PROGRAM_ID)) {
    const decodedIx = decodeInstruction(transactionIx);
    let method = "";
    let args = new Array<Arg>();
    let aois = new Array<Aoi>();
    if (isTransferInstruction(decodedIx)) {
      method = "transfer";
      args = [{ name: "amount", value: decodedIx.data.amount.toString() }];
      aois = [
        { name: "owner", account: decodedIx.keys.owner.pubkey },
        { name: "source", account: decodedIx.keys.source.pubkey },
        { name: "destination", account: decodedIx.keys.destination.pubkey },
      ];
    } else if (isMintToInstruction(decodedIx)) {
      method = "mintTo";
      args = [{ name: "amount", value: decodedIx.data.amount.toString() }];
      aois = [
        { name: "authority", account: decodedIx.keys.authority.pubkey },
        { name: "destination", account: decodedIx.keys.destination.pubkey },
        { name: "mint", account: decodedIx.keys.mint.pubkey },
      ];
    } else if (isBurnInstruction(decodedIx)) {
      method = "burn";
      args = [{ name: "amount", value: decodedIx.data.amount.toString() }];
      aois = [
        { name: "account", account: decodedIx.keys.account.pubkey },
        { name: "mint", account: decodedIx.keys.mint.pubkey },
        { name: "owner", account: decodedIx.keys.owner.pubkey },
      ];
    } else {
      method = `${decodedIx.data.instruction}`;
      args = [{ name: "unknown", value: transactionIx.data.toString("hex") }];
    }

    return {
      program,
      method,
      args,
      aois,
    };
  } else if (
    transactionIx.programId.equals(
      new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
    )
  ) {
    const methodIndex = transactionIx.data.slice(0, 2);
    let method = "unknown";
    const args = [
      { name: "ixData", value: "0x" + transactionIx.data.toString("hex") },
    ];
    if (methodIndex.equals(Buffer.from([0, 0x0a]))) {
      method = "newOrderV3";
    } else if (methodIndex.equals(Buffer.from([0, 0x05]))) {
      method = "settleFunds";
    }
    return {
      program,
      method,
      args,
      aois: [],
    };
  } else if (
    transactionIx.programId.equals(
      new PublicKey("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB")
    )
  ) {
    if (
      transactionIx.data
        .slice(0, 8)
        .equals(Buffer.from([0xe5, 0x17, 0xcb, 0x97, 0x7a, 0xe3, 0xad, 0x2a]))
    ) {
      const args = [
        { name: "ixData", value: "0x" + transactionIx.data.toString("hex") },
      ];
      return {
        program,
        method: "route",
        args,
        aois: [],
      };
    }
  }
}
