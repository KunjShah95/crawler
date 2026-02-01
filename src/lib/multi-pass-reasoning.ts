// Multi-Pass Reasoning Pipeline
// Implements sophisticated multi-step reasoning for complex gap analysis

import { queryGeminiObject, queryGeminiArray, queryGeminiText } from './gemini-client';
import { Gap, GapType } from '../types/research';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface MultiPassResult {
    gapId: string;
    problem: string;
    passes: ReasoningPass[];
    finalConfidence: number;
    synthesisedGap: SynthesisedGap;
    processingTime: number;
}

export interface ReasoningPass {
    passNumber: number;
    type: PassType;
    objective: string;
    findings: string[];
    insights: string[];
    confidence: number;
    duration: number;
}

export type PassType = 
    | 'extraction'
    | 'context_analysis'
    | 'cross_reference'
    | 'methodology_check'
    | 'impact_assessment'
    | 'validation'
    | 'synthesis';

export interface SynthesisedGap {
    problem: string;
    type: GapType;
    confidence: number;
    impactScore: 'low' | 'medium' | 'high';
    difficulty: 'low' | 'medium' | 'high';
    assumptions: string[];
    failures: string[];
    datasetGaps: string[];
    evaluationCritique: string;
    supportingEvidence: string[];
    relatedWork: string[];
    recommendedApproaches: string[];
    risksAndMitigations: string[];
}

interface PaperContext {
    title: string;
    content: string;
    citations: string[];
    methodology?: string;
    results?: string;
    limitations?: string;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const GapPassSchema = z.object({
    problem: z.string(),
    type: z.enum(['data', 'compute', 'evaluation', 'theory', 'deployment', 'methodology']),
    confidence: z.number(),
    impactScore: z.enum(['low', 'medium', 'high']),
    difficulty: z.enum(['low', 'medium', 'high']),
    assumptions: z.array(z.string()),
    failures: z.array(z.string()),
    datasetGaps: z.array(z.string()),
    evaluationCritique: z.string(),
});

const SynthesisSchema = z.object({
    problem: z.string(),
    type: z.enum(['data', 'compute', 'evaluation', 'theory', 'deployment', 'methodology']),
    confidence: z.number(),
    impactScore: z.enum(['low', 'medium', 'high']),
    difficulty: z.enum(['low', 'medium', 'high']),
    assumptions: z.array(z.string()),
    failures: z.array(z.string()),
    datasetGaps: z.array(z.string()),
    evaluationCritique: z.string(),
    supportingEvidence: z.array(z.string()),
    relatedWork: z.array(z.string()),
    recommendedApproaches: z.array(z.string()),
    risksAndMitigations: z.array(z.string()),
});

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export async function runMultiPassReasoning(
    paperContent: string,
    paperContext?: PaperContext,
    options: { maxPasses?: number; timeout?: number } = {}
): Promise<MultiPassResult[]> {
    const startTime = Date.now();
    const maxPasses = options.maxPasses || 5;
    const results: MultiPassResult[] = [];

    const initialPass = await pass1_extraction(paperContent);
    const passes = [initialPass];

    let currentGaps = initialPass.findings;

    if (maxPasses > 1) {
        const contextPass = await pass2_contextAnalysis(currentGaps, paperContext);
        passes.push(contextPass);
        currentGaps = contextPass.findings;
    }

    if (maxPasses > 2) {
        const crossRefPass = await pass3_crossReference(currentGaps, paperContent);
        passes.push(crossRefPass);
        currentGaps = crossRefPass.findings;
    }

    if (maxPasses > 3) {
        const methodPass = await pass4_methodologyCheck(currentGaps, paperContext);
        passes.push(methodPass);
        currentGaps = methodPass.findings;
    }

    if (maxPasses > 4) {
        const impactPass = await pass5_impactAssessment(currentGaps);
        passes.push(impactPass);
    }

    const validationPass = await pass7_validation(passes);
    passes.push(validationPass);

    for (const gapFinding of initialPass.findings) {
        const synthesis = await synthesizeGap(gapFinding, passes, paperContext);
        
        const avgConfidence = passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length;

        results.push({
            gapId: `gap-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            problem: gapFinding,
            passes,
            finalConfidence: avgConfidence,
            synthesisedGap: synthesis,
            processingTime: Date.now() - startTime,
        });
    }

    return results;
}

// ============================================================================
// PASS 1: INITIAL EXTRACTION
// ============================================================================

async function pass1_extraction(content: string): Promise<ReasoningPass> {
    const passStart = Date.now();

    const prompt = `You are a meta-research analyst. Analyze this paper content for research gaps.

Paper content (first 15000 chars):
${content.slice(0, 15000)}

Task: Extract all research gaps, limitations, and unsolved problems. For each gap, provide:
1. A clear problem statement
2. Why it matters
3. What would solving it enable

Return as JSON array of objects: { "problem": "...", "why_matters": "...", "impact": "..." }

If no gaps found, return empty array.`;

    const findings = await queryGeminiArray(prompt, z.array(z.object({
        problem: z.string(),
        why_matters: z.string(),
        impact: z.string(),
    })));

    const insights = findings.map(f => `Gap identified: ${f.problem} (impact: ${f.impact})`);

    return {
        passNumber: 1,
        type: 'extraction',
        objective: 'Extract initial set of research gaps from paper content',
        findings: findings.map(f => f.problem),
        insights,
        confidence: 0.8,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// PASS 2: CONTEXT ANALYSIS
// ============================================================================

async function pass2_contextAnalysis(
    gaps: string[],
    context?: PaperContext
): Promise<ReasoningPass> {
    const passStart = Date.now();

    const contextInfo = context 
        ? `\nPaper context:\nTitle: ${context.title}\nMethodology: ${context.methodology || 'Not specified'}\nResults: ${context.results || 'Not specified'}\nLimitations: ${context.limitations || 'Not specified'}`
        : '';

    const prompt = `Analyze these research gaps in the context of the paper:${contextInfo}

Gaps to analyze:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

For each gap:
1. How does this gap relate to the paper's stated methodology?
2. What evidence in the paper supports or contradicts this gap?
3. Is this gap a genuine limitation or just future work?

Return JSON array of { "gap": "...", "analysis": "...", "supported_by_evidence": boolean }`;

    const analyses = await queryGeminiArray(prompt, z.array(z.object({
        gap: z.string(),
        analysis: z.string(),
        supported_by_evidence: z.boolean(),
    })));

    const insights = analyses
        .filter(a => a.supported_by_evidence)
        .map(a => `Evidence-backed: ${a.gap.substring(0, 50)}...`);

    const unsupported = analyses.filter(a => !a.supported_by_evidence);

    return {
        passNumber: 2,
        type: 'context_analysis',
        objective: 'Validate gaps against paper context and evidence',
        findings: analyses.map(a => a.gap),
        insights: [...insights, ...unsupported.map(a => `Potentially weak: ${a.gap.substring(0, 50)}...`)],
        confidence: analyses.filter(a => a.supported_by_evidence).length / analyses.length,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// PASS 3: CROSS-REFERENCE CHECK
// ============================================================================

async function pass3_crossReference(
    gaps: string[],
    content: string
): Promise<ReasoningPass> {
    const passStart = Date.now();

    const prompt = `Cross-reference these research gaps against the paper's references and related work section.

Gaps:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

For each gap:
1. Which cited papers are most relevant to addressing this gap?
2. Has any reference already attempted to solve this?
3. What alternative approaches are mentioned?

Return JSON array of { "gap": "...", "relevant_references": [...], "already_addressed": boolean, "alternatives": [...] }`;

    const crossRefs = await queryGeminiArray(prompt, z.array(z.object({
        gap: z.string(),
        relevant_references: z.array(z.string()),
        already_addressed: z.boolean(),
        alternatives: z.array(z.string()),
    })));

    const insights = crossRefs
        .filter(c => c.already_addressed)
        .map(c => `Partially addressed: ${c.gap.substring(0, 40)}...`);

    return {
        passNumber: 3,
        type: 'cross_reference',
        objective: 'Check if gaps are already addressed in references',
        findings: crossRefs.map(c => `${c.gap} (refs: ${c.relevant_references.slice(0, 2).join(', ')})`),
        insights: [...insights, ...crossRefs.filter(c => !c.already_addressed).map(c => `Novel gap: ${c.gap.substring(0, 40)}...`)],
        confidence: 0.85,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// PASS 4: METHODOLOGY CHECK
// ============================================================================

async function pass4_methodologyCheck(
    gaps: string[],
    context?: PaperContext
): Promise<ReasoningPass> {
    const passStart = Date.now();

    const methodology = context?.methodology || 'Not available';

    const prompt = `Evaluate each research gap against the paper's methodology.

Paper methodology:
${methodology}

Gaps:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

For each gap:
1. Is the gap addressable with the current methodology?
2. What methodological innovations would be needed?
3. What data or compute requirements are implied?

Return JSON array of { "gap": "...", "addressable": boolean, "methodological_gaps": [...], "requirements": "..." }`;

    const analyses = await queryGeminiArray(prompt, z.array(z.object({
        gap: z.string(),
        addressable: z.boolean(),
        methodological_gaps: z.array(z.string()),
        requirements: z.string(),
    })));

    const insights = analyses
        .filter(a => a.addressable)
        .map(a => `Methodologically addressable: ${a.gap.substring(0, 40)}...`);

    return {
        passNumber: 4,
        type: 'methodology_check',
        objective: 'Evaluate methodological feasibility of addressing gaps',
        findings: analyses.map(a => a.gap),
        insights: [...insights, ...analyses.filter(a => !a.addressable).map(a => `Requires new methodology: ${a.gap.substring(0, 40)}...`)],
        confidence: 0.75,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// PASS 5: IMPACT ASSESSMENT
// ============================================================================

async function pass5_impactAssessment(
    gaps: string[]
): Promise<ReasoningPass> {
    const passStart = Date.now();

    const prompt = `Assess the potential impact of solving these research gaps.

Gaps:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

For each gap:
1. What is the potential impact on the field (low/medium/high)?
2. What are the practical applications?
3. How does it advance the state of the art?

Return JSON array of { "gap": "...", "impact": "low|medium|high", "applications": [...], "advancement": "..." }`;

    const assessments = await queryGeminiArray(prompt, z.array(z.object({
        gap: z.string(),
        impact: z.enum(['low', 'medium', 'high']),
        applications: z.array(z.string()),
        advancement: z.string(),
    })));

    const insights = assessments
        .filter(a => a.impact === 'high')
        .map(a => `High impact: ${a.gap.substring(0, 40)}... → ${a.applications[0]}`);

    return {
        passNumber: 5,
        type: 'impact_assessment',
        objective: 'Assess potential impact of solving gaps',
        findings: assessments.map(a => `${a.gap} (impact: ${a.impact})`),
        insights,
        confidence: 0.7,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// PASS 7: VALIDATION
// ============================================================================

async function pass7_validation(passes: ReasoningPass[]): Promise<ReasoningPass> {
    const passStart = Date.now();

    const passSummary = passes.map(p => 
        `Pass ${p.passNumber} (${p.type}): ${p.findings.length} findings, confidence: ${p.confidence}`
    ).join('\n');

    const prompt = `Validate the reasoning pipeline results.

Pipeline passes:
${passSummary}

Task:
1. Identify any contradictions between passes
2. Assess overall confidence in the findings
3. Identify the most reliable gaps based on cross-pass validation

Return JSON: { "contradictions": [...], "overall_confidence": number, "reliable_gaps": [...], "recommendations": [...] }`;

    const validation = await queryGeminiObject(prompt, z.object({
        contradictions: z.array(z.string()),
        overall_confidence: z.number(),
        reliable_gaps: z.array(z.string()),
        recommendations: z.array(z.string()),
    }));

    return {
        passNumber: 7,
        type: 'validation',
        objective: 'Validate reasoning across all passes',
        findings: validation.reliable_gaps,
        insights: validation.recommendations,
        confidence: validation.overall_confidence,
        duration: Date.now() - passStart,
    };
}

// ============================================================================
// SYNTHESIS
// ============================================================================

async function synthesizeGap(
    gap: string,
    passes: ReasoningPass[],
    context?: PaperContext
): Promise<SynthesisedGap> {
    const passInsights = passes
        .flatMap(p => p.insights)
        .filter(i => i.includes(gap.substring(0, 20)) || i.includes('addressable') || i.includes('impact'))
        .slice(0, 5);

    const prompt = `Synthesize a comprehensive gap analysis for this research gap.

Gap: ${gap}

Relevant insights from multi-pass analysis:
${passInsights.join('\n')}

${context ? `Paper context: ${context.title}` : ''}

Return comprehensive JSON with:
- problem: Final problem statement
- type: classification (data/compute/evaluation/theory/deployment/methodology)
- confidence: 0-1 confidence score
- impactScore: low/medium/high
- difficulty: low/medium/high
- assumptions: array of assumptions
- failures: array of failed approaches
- datasetGaps: array of data limitations
- evaluationCritique: critique of evaluation approach
- supportingEvidence: array of evidence
- relatedWork: array of related work
- recommendedApproaches: array of recommended approaches
- risksAndMitigations: array of risks with mitigations`;

    const synthesis = await queryGeminiObject(prompt, SynthesisSchema);
    return synthesis;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const multiPassReasoning = {
    runMultiPassReasoning,
};

export default multiPassReasoning;
