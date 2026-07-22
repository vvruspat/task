import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  type GoogleDriveWebhookHeaders,
  InvalidGoogleDriveWebhookError,
  parseGoogleDriveWebhookHeaders,
} from "./google-drive-webhook.contracts.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { GoogleDriveWebhookService } from "./google-drive-webhook.service.js";

@ApiTags("integrations")
@Controller("integrations/webhooks/google-drive")
export class GoogleDriveWebhookController {
  constructor(private readonly webhookService: GoogleDriveWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Receive a Google Drive change-channel notification" })
  @ApiHeader({ name: "X-Goog-Channel-ID", required: true })
  @ApiHeader({ name: "X-Goog-Channel-Token", required: true })
  @ApiHeader({ name: "X-Goog-Message-Number", required: true })
  @ApiHeader({ name: "X-Goog-Resource-ID", required: true })
  @ApiHeader({ name: "X-Goog-Resource-State", required: true })
  @ApiHeader({ name: "X-Goog-Resource-URI", required: true })
  @ApiNoContentResponse({ description: "The notification was accepted or already processed." })
  @ApiBadRequestResponse({ description: "Required Google Drive headers are malformed." })
  @ApiForbiddenResponse({ description: "The channel, token, or resource does not match." })
  @ApiServiceUnavailableResponse({ description: "The change feed could not be processed." })
  async receive(@Headers() headers: GoogleDriveWebhookHeaders): Promise<void> {
    try {
      await this.webhookService.receive(parseGoogleDriveWebhookHeaders(headers));
    } catch (error: unknown) {
      if (error instanceof InvalidGoogleDriveWebhookError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
