import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskSummaryDto } from "../tasks/tasks.dto.js";
import type {
  ProjectMatrix,
  ProjectMatrixCell,
  ProjectMatrixStage,
} from "./project-matrix.contracts.js";

export class ProjectMatrixStageDto implements ProjectMatrixStage {
  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly id: string | null;

  @ApiProperty({ example: "In progress" }) readonly name: string;

  @ApiPropertyOptional({ example: "#2563EB", nullable: true, type: String })
  readonly color: string | null;

  @ApiProperty({ example: "1000" }) readonly position: string;

  @ApiProperty() readonly isDone: boolean;

  constructor(stage: ProjectMatrixStage) {
    this.id = stage.id;
    this.name = stage.name;
    this.color = stage.color;
    this.position = stage.position;
    this.isDone = stage.isDone;
  }
}

export class ProjectMatrixCellDto implements ProjectMatrixCell {
  @ApiProperty({ format: "uuid" }) readonly columnTaskId: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly stageId: string | null;

  @ApiProperty({ isArray: true, type: TaskSummaryDto }) readonly tasks: TaskSummaryDto[];

  constructor(cell: ProjectMatrixCell) {
    this.columnTaskId = cell.columnTaskId;
    this.stageId = cell.stageId;
    this.tasks = cell.tasks.map((task) => new TaskSummaryDto(task));
  }
}

export class ProjectMatrixDto implements ProjectMatrix {
  @ApiProperty({ isArray: true, type: TaskSummaryDto }) readonly columns: TaskSummaryDto[];

  @ApiProperty({ isArray: true, type: ProjectMatrixStageDto })
  readonly stages: ProjectMatrixStageDto[];

  @ApiProperty({ isArray: true, type: ProjectMatrixCellDto })
  readonly cells: ProjectMatrixCellDto[];

  constructor(matrix: ProjectMatrix) {
    this.columns = matrix.columns.map((task) => new TaskSummaryDto(task));
    this.stages = matrix.stages.map((stage) => new ProjectMatrixStageDto(stage));
    this.cells = matrix.cells.map((cell) => new ProjectMatrixCellDto(cell));
  }
}
