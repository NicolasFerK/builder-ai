import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { configService } from "../services/ConfigService";

export default defineHandler(async (event) => {
  const body = await readBody<any>(event);
  
  if (!body) {
    throw new Error("Request body is required");
  }

  if (body.aisettings) {
    return await configService.updateAISettings(body.aisettings);
  }

  if (typeof body.publicPreviewUrl !== 'undefined') {
    // Basic validation for URL
    if (body.publicPreviewUrl) {
      try {
        new URL(body.publicPreviewUrl);
      } catch (e) {
        throw new Error("Invalid URL format");
      }
    }
    return await configService.updatePublicPreviewUrl(body.publicPreviewUrl);
  }

  throw new Error("Invalid request body. Provide 'aisettings' or 'publicPreviewUrl'.");
});
