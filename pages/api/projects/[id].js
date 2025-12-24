const prisma = require("../../../lib/prisma");

export default async function handler(req, res) {
  const { id } = req.query;
  const projectId = parseInt(id);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  if (req.method === "GET") {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          entries: true,
          goals: true,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      return res.status(200).json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      return res.status(500).json({ error: "Failed to fetch project" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { name, color } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;

      const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });

      return res.status(200).json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      return res.status(500).json({ error: "Failed to update project" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Check if project has entries or goals
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          goals: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              entries: true,
              goals: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Delete all related data in correct order (respecting foreign key constraints)

      // 1. Delete GoalDayStatus for all goals of this project
      if (project.goals.length > 0) {
        const goalIds = project.goals.map((g) => g.id);
        await prisma.goalDayStatus.deleteMany({
          where: {
            goalId: { in: goalIds },
          },
        });
      }

      // 2. Delete all goals of this project
      await prisma.goal.deleteMany({
        where: { projectId: projectId },
      });

      // 3. Delete all time entries of this project
      await prisma.timeEntry.deleteMany({
        where: { projectId: projectId },
      });

      // 4. Finally, delete the project itself
      await prisma.project.delete({
        where: { id: projectId },
      });

      return res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      return res.status(500).json({ error: "Failed to delete project" });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
