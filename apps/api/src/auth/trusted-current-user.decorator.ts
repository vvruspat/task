import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";

export const trustedCurrentUserIdHeader = "x-task-user-id";

export const ApiTrustedCurrentUser = (): MethodDecorator & ClassDecorator =>
  ApiHeader({
    name: trustedCurrentUserIdHeader,
    description:
      "Temporary trusted user context header until AuthModule owns request identity. Not an authentication mechanism.",
    required: true,
    schema: { format: "uuid", type: "string" },
  });

export const TrustedCurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TrustedCurrentUserRequest>();

    return parseTrustedCurrentUserId(request.headers[trustedCurrentUserIdHeader]);
  },
);

export function parseTrustedCurrentUserId(value: TrustedCurrentUserHeader): string {
  if (typeof value !== "string" || !uuidV4Pattern.test(value)) {
    throw new BadRequestException(`${trustedCurrentUserIdHeader} must be a UUID v4 value.`);
  }

  return value;
}

type TrustedCurrentUserHeader = string | string[] | undefined;

type TrustedCurrentUserRequest = {
  headers: Record<string, TrustedCurrentUserHeader>;
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
