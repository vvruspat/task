import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { BrevoInvitationMailer } from "./brevo-invitation.mailer.js";
import { InvitationsController, WorkspaceInvitationsController } from "./invitations.controller.js";
import { InvitationsService } from "./invitations.service.js";
import type { InvitationMailer, WorkspaceInvitationStore } from "./invitations.store.js";
import { TypeOrmInvitationsStore } from "./typeorm-invitations.store.js";

const invitationsServiceProvider: Provider<InvitationsService> = {
  provide: InvitationsService,
  useFactory: (store: WorkspaceInvitationStore, mailer: InvitationMailer): InvitationsService =>
    new InvitationsService(store, mailer),
  inject: [TypeOrmInvitationsStore, BrevoInvitationMailer],
};

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspaceInvitationsController, InvitationsController],
  providers: [TypeOrmInvitationsStore, BrevoInvitationMailer, invitationsServiceProvider],
})
export class InvitationsModule {}
