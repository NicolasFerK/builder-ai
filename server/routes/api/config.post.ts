import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { configService } from "../services/ConfigService";

export default defineHandler(async (event) => {
  const body = await readBody<any>(event);
  
  console.log('[Config API] Request body:', JSON.stringify(body));

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "Request body is required" });
  }

  try {
    if (body.aisettings && typeof body.aisettings === 'object') {
      console.log('[Config API] Updating AISettings:', JSON.stringify(body.aisettings));
      const result = await configService.updateAISettings(body.aisettings);
      console.log('[Config API] AISettings updated successfully:', JSON.stringify(result));
      return result;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'publicPreviewUrl')) {
      const url = body.publicPreviewUrl;
      console.log('[Config API] Updating PublicPreviewUrl:', url);
      if (url) {
        try {
          new URL(url);
        } catch (e) {
          console.error('[Config API] Invalid URL format:', url);
          throw createError({ statusCode: 400, statusMessage: "Invalid URL format" });
        }
      }
      const result = await configService.updatePublicPreviewUrl(url);
      console.log('[Config API] PublicPreviewUrl updated successfully:', result);
      return result;
    }

    throw createError({ statusCode: 400, statusMessage: "Invalid request body. Provide 'aisettings' or 'publicPreviewUrl'." });
  } catch (error: any) {
    console.error('[Config API] Error occurred:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || "Internal Server Error" });
  }
});
