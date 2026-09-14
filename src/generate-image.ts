import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { rootDir } from "./utils.js";

dotenv.config({ path: path.join(rootDir, ".env") });

const DEFAULT_MODEL = "gpt-image-1.5";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "high";
const DEFAULT_FORMAT = "png";

export interface GenerateImageOptions {
  prompt: string;
  model?: "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  format?: "png" | "jpeg" | "webp";
  background?: "transparent" | "opaque" | "auto";
  outputPath?: string;
  compression?: number; // 0-100 for jpeg/webp
}

export interface GenerateImageResult {
  success: boolean;
  imagePath?: string;
  imageBase64?: string;
  error?: string;
  revisedPrompt?: string;
}

/**
 * Generate an image using OpenAI's GPT Image models
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OPENAI_API_KEY environment variable is not set",
      };
    }

    const openai = new OpenAI({ apiKey });

    const {
      prompt,
      model = DEFAULT_MODEL,
      size = DEFAULT_SIZE,
      quality = DEFAULT_QUALITY,
      format = DEFAULT_FORMAT,
      background = "auto",
      outputPath,
      compression,
    } = options;

    console.error(`Generating image with model: ${model}`);
    console.error(`Prompt: ${prompt}`);

    // Generate the image
    const result = await openai.images.generate({
      model,
      prompt,
      size: size === "auto" ? undefined : size,
      quality: quality === "auto" ? undefined : quality,
      response_format: format === "png" ? "b64_json" : "b64_json",
      ...(background !== "auto" && { background }),
      ...(compression !== undefined && { output_compression: compression }),
      n: 1,
    });

    if (!result.data || result.data.length === 0) {
      return {
        success: false,
        error: "No image data returned from OpenAI",
      };
    }

    const imageBase64 = result.data[0].b64_json;
    if (!imageBase64) {
      return {
        success: false,
        error: "No base64 image data in response",
      };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Save to file if outputPath is provided
    let savedPath: string | undefined;
    if (outputPath) {
      const fullPath = path.isAbsolute(outputPath)
        ? outputPath
        : path.join(rootDir, outputPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, imageBuffer);
      savedPath = fullPath;
      console.error(`Image saved to: ${savedPath}`);
    } else {
      // Save to images directory by default
      const imagesDir = path.join(rootDir, "images");
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      const timestamp = Date.now();
      const filename = `generated-${timestamp}.${format}`;
      savedPath = path.join(imagesDir, filename);
      fs.writeFileSync(savedPath, imageBuffer);
      console.error(`Image saved to: ${savedPath}`);
    }

    return {
      success: true,
      imagePath: savedPath,
      imageBase64,
      revisedPrompt: (result as any).revised_prompt,
    };
  } catch (error: any) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error: error?.message || "Unknown error generating image",
    };
  }
}

/**
 * Generate an image and return it as a data URL for use in token creation
 */
export async function generateImageForToken(
  prompt: string,
  tokenName?: string
): Promise<GenerateImageResult> {
  const outputPath = tokenName
    ? path.join(rootDir, "images", `token-${tokenName.toLowerCase().replace(/\s+/g, "-")}.png`)
    : undefined;

  return generateImage({
    prompt,
    model: "gpt-image-1.5",
    size: "1024x1024",
    quality: "high",
    format: "png",
    background: "auto",
    outputPath,
  });
}

/**
 * Format the result for MCP response
 */
export function formatGenerateImageResult(
  result: GenerateImageResult
): string {
  if (!result.success) {
    return `Error generating image: ${result.error}`;
  }

  const lines = [
    `✅ Image generated successfully!`,
    result.imagePath ? `📁 Saved to: ${result.imagePath}` : "",
    result.revisedPrompt
      ? `📝 Revised prompt: ${result.revisedPrompt}`
      : "",
    result.imageBase64
      ? `🖼️  Image data: ${result.imageBase64.substring(0, 50)}... (base64)`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage: node generate-image.js <prompt> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --model <model>        Model: gpt-image-1.5, gpt-image-1, gpt-image-1-mini");
    console.error("  --size <size>          Size: 1024x1024, 1024x1536, 1536x1024, auto");
    console.error("  --quality <quality>    Quality: low, medium, high, auto");
    console.error("  --format <format>       Format: png, jpeg, webp");
    console.error("  --background <bg>       Background: transparent, opaque, auto");
    console.error("  --output <path>        Output file path");
    console.error("  --compression <0-100>  Compression level (for jpeg/webp)");
    console.error("");
    console.error("Example:");
    console.error(
      '  node generate-image.js "A futuristic token logo with neon colors" --model gpt-image-1.5 --quality high'
    );
    process.exit(1);
  }

  const prompt = args[0];
  const options: GenerateImageOptions = { prompt };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--model":
        if (nextArg) {
          options.model = nextArg as any;
          i++;
        }
        break;
      case "--size":
        if (nextArg) {
          options.size = nextArg as any;
          i++;
        }
        break;
      case "--quality":
        if (nextArg) {
          options.quality = nextArg as any;
          i++;
        }
        break;
      case "--format":
        if (nextArg) {
          options.format = nextArg as any;
          i++;
        }
        break;
      case "--background":
        if (nextArg) {
          options.background = nextArg as any;
          i++;
        }
        break;
      case "--output":
        if (nextArg) {
          options.outputPath = nextArg;
          i++;
        }
        break;
      case "--compression":
        if (nextArg) {
          options.compression = parseInt(nextArg);
          i++;
        }
        break;
    }
  }

  try {
    const result = await generateImage(options);
    const formatted = formatGenerateImageResult(result);
    console.log("\n" + formatted);

    if (!result.success) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export default {
  generateImage,
  generateImageForToken,
  formatGenerateImageResult,
};

