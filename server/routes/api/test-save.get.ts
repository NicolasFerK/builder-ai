import { defineHandler } from "nitro";
import testSave from "../services/test-save";

export default defineHandler(async (event) => {
  return await testSave();
});
