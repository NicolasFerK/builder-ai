import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { configService } from "../services/ConfigService";

export default defineHandler(async (event) => {
  const body = await readBody<any>(event);
  
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "Request body is required" });
  }

  try {
    if (body.aisettings && typeof body.aisettings === 'object') {
      return await configService.updateAISettings(body.aisettings);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'publicPreviewUrl')) {
      const url = body.publicPreviewUrl;
      if (url) {
        try {
          new URL(url);
        } catch (e) {
          throw createError({ statusCode: 400, statusMessage: "Invalid URL format" });
        }
      }
      return await configService.updatePublicPreviewUrl(url);
    }

    throw createError({ statusCode: 400, statusMessage: "Invalid request body. Provide 'aisettings' or 'publicPreviewUrl'." });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || "Internal Server Error" });
  }
});
