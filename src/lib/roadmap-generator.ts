// Roadmap generation utilities for research planning

export interface RoadmapPhase {
  name: string
  duration: string
  deliverables: string[]
  milestones: string[]
}

export interface ResearchRoadmap {
  id: string
  title: string
  phases: RoadmapPhase[]
  totalDuration: string
  riskFactors: string[]
  dependencies: string[]
}

export function generateRoadmap(
  topic: string,
  complexity: "low" | "medium" | "high"
): ResearchRoadmap {
  const phaseCount = complexity === "low" ? 3 : complexity === "medium" ? 4 : 5
  
  const phases: RoadmapPhase[] = []
  
  for (let i = 1; i <= phaseCount; i++) {
    phases.push({
      name: `Phase ${i}: ${getPhaseName(i, phaseCount)}`,
      duration: getPhaseDuration(i, phaseCount, complexity),
      deliverables: getPhaseDeliverables(i, phaseCount),
      milestones: getPhaseMilestones(i, phaseCount)
    })
  }
  
  return {
    id: `roadmap-${Date.now()}`,
    title: `Research Roadmap: ${topic}`,
    phases,
    totalDuration: calculateTotalDuration(phaseCount, complexity),
    riskFactors: identifyRisks(complexity),
    dependencies: identifyDependencies(phaseCount)
  }
}

function getPhaseName(phase: number, total: number): string {
  const names: Record<number, string> = {
    1: "Foundation",
    2: "Exploration",
    3: "Development",
    4: "Evaluation",
    5: "Publication"
  }
  return names[phase] || `Phase ${phase}`
}

function getPhaseDuration(phase: number, total: number, complexity: string): string {
  const baseMonths = complexity === "low" ? 1 : complexity === "medium" ? 2 : 3
  const multiplier = phase === 1 ? 1.5 : phase === total ? 1.2 : 1
  return `${Math.round(baseMonths * multiplier)} months`
}

function getPhaseDeliverables(phase: number, total: number): string[] {
  const deliverables: Record<number, string[]> = {
    1: ["Literature review", "Methodology report", "Data collection plan"],
    2: ["Prototype", "Initial experiments", "Baseline results"],
    3: ["Core implementation", "Comparative analysis", "Performance metrics"],
    4: ["Evaluation study", "User testing", "Optimization"],
    5: ["Paper draft", "Documentation", "Repository setup"]
  }
  return deliverables[phase] || [`Phase ${phase} deliverables`]
}

function getPhaseMilestones(phase: number, total: number): string[] {
  return [
    `Milestone ${phase}.1: Planning complete`,
    `Milestone ${phase}.2: Implementation done`,
    `Milestone ${phase}.3: Validation achieved`
  ]
}

function calculateTotalDuration(phaseCount: number, complexity: string): string {
  const baseMonths = complexity === "low" ? 6 : complexity === "medium" ? 12 : 18
  return `${baseMonths} months`
}

function identifyRisks(complexity: string): string[] {
  const risks = [
    "Data availability",
    "Technical feasibility",
    "Resource constraints"
  ]
  if (complexity === "high") {
    risks.push("Timeline overrun", "Scope creep")
  }
  return risks
}

function identifyDependencies(phaseCount: number): string[] {
  return [
    "Prior work review",
    "Dataset acquisition",
    "Compute resources",
    "Expert consultation"
  ]
}
