declare namespace NodeJS {
  interface ProcessEnv {
    MAIN_RPC_URL: string;
    TEST_PRIVATE_KEY?: string;
  }
}
