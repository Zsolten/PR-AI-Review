import { prisma } from "../../db/client.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";

export class TeamRulesService {
  async listEnabledRules(repositoryId: string): Promise<string[]> {
    const rules = await prisma.teamRule.findMany({
      where: { repositoryId, enabled: true },
      orderBy: { createdAt: "asc" },
      select: { content: true },
    });
    return rules.map((r) => r.content);
  }

  async listRules(repositoryId: string) {
    await this.ensureRepository(repositoryId);
    return prisma.teamRule.findMany({
      where: { repositoryId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createRule(repositoryId: string, content: string) {
    await this.ensureRepository(repositoryId);
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestError("Rule content cannot be empty");
    }
    return prisma.teamRule.create({
      data: { repositoryId, content: trimmed },
    });
  }

  async updateRule(
    repositoryId: string,
    ruleId: string,
    data: { content?: string; enabled?: boolean }
  ) {
    await this.ensureRule(repositoryId, ruleId);
    const update: { content?: string; enabled?: boolean } = {};
    if (data.content !== undefined) {
      const trimmed = data.content.trim();
      if (!trimmed) throw new BadRequestError("Rule content cannot be empty");
      update.content = trimmed;
    }
    if (data.enabled !== undefined) update.enabled = data.enabled;

    return prisma.teamRule.update({
      where: { id: ruleId },
      data: update,
    });
  }

  async deleteRule(repositoryId: string, ruleId: string) {
    await this.ensureRule(repositoryId, ruleId);
    await prisma.teamRule.delete({ where: { id: ruleId } });
  }

  private async ensureRepository(repositoryId: string) {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new NotFoundError("Repository not found");
  }

  private async ensureRule(repositoryId: string, ruleId: string) {
    const rule = await prisma.teamRule.findFirst({
      where: { id: ruleId, repositoryId },
    });
    if (!rule) throw new NotFoundError("Team rule not found");
  }
}
