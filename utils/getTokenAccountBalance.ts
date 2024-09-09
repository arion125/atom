import { Connection, PublicKey } from '@solana/web3.js';

export const getTokenAccountBalance = async (
  connection: Connection,
  tokenAccounKey: PublicKey,
) => {
  try {
    const tokenAccount = await connection.getTokenAccountBalance(
      tokenAccounKey,
      'confirmed',
    );
    if (tokenAccount.value.uiAmount == null) {
      return 0;
    } else {
      return tokenAccount.value.uiAmount;
    }
  } catch (e) {
    return 0;
  }
};
