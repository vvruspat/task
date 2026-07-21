import { Body, Controller, Get, Headers, HttpCode, Inject, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.contracts.js";
import {
  AuthSessionDto,
  AuthSessionInfoDto,
  AuthUserDto,
  LoginDto,
  ParseLoginBodyPipe,
  ParseRegisterBodyPipe,
  ParseUpdateProfileBodyPipe,
  RegisterDto,
  UpdateProfileDto,
} from "./auth.dto.js";
import { AuthService, readBearerToken } from "./auth.service.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Create an email/password account and initial session" })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: AuthSessionDto })
  @ApiConflictResponse({ description: "The email address is already registered." })
  async register(@Body(ParseRegisterBodyPipe) input: RegisterInput): Promise<AuthSessionDto> {
    return new AuthSessionDto(await this.service.register(input));
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a session with email and password" })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ description: "Email or password is incorrect." })
  async login(@Body(ParseLoginBodyPipe) input: LoginInput): Promise<AuthSessionDto> {
    return new AuthSessionDto(await this.service.login(input));
  }

  @Get("session")
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthSessionInfoDto })
  @ApiUnauthorizedResponse({ description: "Session is invalid or expired." })
  async session(
    @Headers("authorization") authorization: string | undefined,
  ): Promise<AuthSessionInfoDto> {
    return new AuthSessionInfoDto(await this.service.getSession(readBearerToken(authorization)));
  }

  @Patch("profile")
  @ApiBearerAuth()
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: "Session is invalid or expired." })
  async updateProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body(ParseUpdateProfileBodyPipe) input: UpdateProfileInput,
  ): Promise<AuthUserDto> {
    return new AuthUserDto(await this.service.updateProfile(readBearerToken(authorization), input));
  }

  @Post("logout")
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: "Session revoked." })
  @ApiUnauthorizedResponse({ description: "A bearer session token is required." })
  async logout(@Headers("authorization") authorization: string | undefined): Promise<void> {
    await this.service.logout(readBearerToken(authorization));
  }
}
