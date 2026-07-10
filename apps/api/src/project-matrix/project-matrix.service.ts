import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectMatrixDto } from "./project-matrix.dto.js";
import type { ProjectMatrixReadStore } from "./project-matrix.store.js";

@Injectable()
export class ProjectMatrixService {
  constructor(private readonly readStore: ProjectMatrixReadStore) {}

  async getProjectMatrix(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectMatrixDto> {
    const matrix = await this.readStore.getForProject(workspaceId, projectId, userId);

    if (matrix === null) {
      throw new NotFoundException("Project was not found.");
    }

    return new ProjectMatrixDto(matrix);
  }
}
