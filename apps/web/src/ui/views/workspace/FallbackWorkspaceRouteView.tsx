import { Card, Flex, Heading, Table, Text } from "@task/ui/app";
import type { ReactElement } from "react";
import type { ProjectSummary, TaskSkillSummary, TaskSummary, WorkspaceRoute } from "./types.js";

export type FallbackWorkspaceRouteViewProps = {
  projects: ProjectSummary[];
  route: WorkspaceRoute;
  skills: TaskSkillSummary[];
  tasks: TaskSummary[];
};

export function FallbackWorkspaceRouteView({
  projects,
  route,
  skills,
  tasks,
}: FallbackWorkspaceRouteViewProps): ReactElement {
  const visibleRows = route.id === "templates" ? skills.length : tasks.length;

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Text color="gray" size="2">
              Lazy view
            </Text>
            <Heading size="6">{route.label}</Heading>
          </Flex>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Project</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tasks.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4}>
                    <Text color="gray">No rows loaded</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                tasks.map((task) => (
                  <Table.Row key={task.id}>
                    <Table.Cell>{task.title}</Table.Cell>
                    <Table.Cell>
                      {projects.find((project) => project.id === task.projectId)?.title ??
                        "Unknown project"}
                    </Table.Cell>
                    <Table.Cell>Open</Table.Cell>
                    <Table.Cell>
                      {task.assigneeUserId === null ? "Unassigned" : "Assigned"}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="2">
          <Heading size="5">Ready for data</Heading>
          <Text color="gray">{route.description}</Text>
          <Text>
            Rows: {visibleRows} · Projects: {projects.length} · Skills: {skills.length}
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
