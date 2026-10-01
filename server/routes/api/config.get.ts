import { defineHandler } from "nitro";
import { configService } from "../../services/ConfigService";

export default defineHandler(async (event) => {
  return await configService.load();
});
