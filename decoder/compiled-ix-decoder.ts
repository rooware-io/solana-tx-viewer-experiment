import {
  AccountKeysFromLookups,
  AccountMeta,
  CompiledInstruction,
  MessageAccountKeys,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedMessage,
} from "@solana/web3.js";
import base58 from "bs58";

// This is a helper to unwind a CompiledInstruction for an innerInstruction given the top level data
export function decompileCompiledIx(
  compiledIx: CompiledInstruction,
  message: VersionedMessage,
  accountKeys: MessageAccountKeys
): TransactionInstruction {
  // This repeats for every single inner instruction
  const { header } = message;
  const {
    numRequiredSignatures,
    numReadonlySignedAccounts,
    numReadonlyUnsignedAccounts,
  } = header;

  const numWritableSignedAccounts =
    numRequiredSignatures - numReadonlySignedAccounts;
  // assert(numWritableSignedAccounts > 0, 'Message header is invalid');

  const numWritableUnsignedAccounts =
    message.staticAccountKeys.length - numReadonlyUnsignedAccounts;
  // assert(numWritableUnsignedAccounts >= 0, 'Message header is invalid');

  const keys = new Array<AccountMeta>();
  for (const keyIndex of compiledIx.accounts) {
    const pubkey = accountKeys.get(keyIndex);
    if (pubkey === undefined) {
      throw new Error(`Failed to find key for account key index ${keyIndex}`);
    }

    const isSigner = keyIndex < numRequiredSignatures;

    let isWritable;
    if (isSigner) {
      isWritable = keyIndex < numWritableSignedAccounts;
    } else if (keyIndex < accountKeys.staticAccountKeys.length) {
      isWritable =
        keyIndex - numRequiredSignatures < numWritableUnsignedAccounts;
    } else {
      isWritable =
        keyIndex - accountKeys.staticAccountKeys.length <
        // accountKeysFromLookups cannot be undefined because we already found a pubkey for this index above
        accountKeys.accountKeysFromLookups!.writable.length;
    }

    keys.push({
      pubkey,
      isSigner: keyIndex < header.numRequiredSignatures,
      isWritable,
    });
  }

  const programId = accountKeys.get(compiledIx.programIdIndex);
  if (programId === undefined) {
    throw new Error(
      `Failed to find program id for program id index ${compiledIx.programIdIndex}`
    );
  }

  return {
    programId,
    keys,
    data: Buffer.from(base58.decode(compiledIx.data)),
  };
}
