import { defineHandler } from "nitro";
import testSave from "../../test-save";

export default defineHandler(async (event) => {
  return await testSave();
});
