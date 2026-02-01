export interface DatasetInfo {
    id: string;
    name: string;
    description: string;
    url: string;
    paperId?: string;
    paperTitle?: string;
    size: string;
    format: string[];
    taskType: string[];
    domain: string;
    license: string;
    downloadCount?: number;
    citationCount: number;
    qualityScore: number;
    lastUpdated: string;
    features: string[];
    splits?: {
        train: number;
        validation: number;
        test: number;
    };
}

export interface BenchmarkInfo {
    id: string;
    name: string;
    description: string;
    datasetIds: string[];
    metrics: string[];
    paperId?: string;
    paperTitle?: string;
    year: number;
    venue: string;
    bestScore: number;
    bestModel: string;
    improvementRate: number;
    participants: Array<{
        model: string;
        organization: string;
        score: number;
        date: string;
    }>;
}

export interface DataQualityScore {
    overall: number;
    completeness: number;
    consistency: number;
    accuracy: number;
    timeliness: number;
    issues: string[];
    recommendations: string[];
}

export interface SyntheticDataRecommendation {
    type: 'augmentation' | 'generation' | 'simulation';
    description: string;
    tools: string[];
    expectedImprovement: string;
    considerations: string[];
}

export async function findDatasetsForGaps(
    gaps: Array<{ id: string; problem: string; type: string }>
): Promise<DatasetInfo[]> {
    const datasets: DatasetInfo[] = [];
    
    for (const gap of gaps) {
        const gapDatasets = await searchDatasets(gap.problem, gap.type);
        datasets.push(...gapDatasets);
    }
    
    return deduplicateDatasets(datasets);
}

export async function searchDatasets(queryText: string, taskType?: string, limitCount = 20): Promise<DatasetInfo[]> {
    const datasets: DatasetInfo[] = [];
    
    const datasetPatterns: Record<string, DatasetInfo> = {
        'image': {
            id: 'imagenet',
            name: 'ImageNet',
            description: 'Large-scale image database for visual object recognition',
            url: 'https://www.image-net.org',
            size: '~150GB',
            format: ['JPEG'],
            taskType: ['classification', 'detection'],
            domain: 'Computer Vision',
            license: 'Custom',
            downloadCount: 500000,
            citationCount: 50000,
            qualityScore: 95,
            lastUpdated: '2024',
            features: ['1000 categories', '1.2M images', 'Bounding boxes']
        },
        'text': {
            id: 'glue',
            name: 'GLUE Benchmark',
            description: 'General Language Understanding Evaluation benchmark',
            url: 'https://gluebenchmark.com',
            size: '~10GB',
            format: ['JSON', 'TSV'],
            taskType: ['classification', 'question_answering', 'similarity'],
            domain: 'NLP',
            license: 'MIT',
            downloadCount: 100000,
            citationCount: 10000,
            qualityScore: 92,
            lastUpdated: '2024',
            features: ['9 tasks', 'Multi-genre', 'Multi-lingual']
        },
        'code': {
            id: 'codenet',
            name: 'CodeNet',
            description: 'Large-scale dataset for AI coding',
            url: 'https://github.com/IBM/CodeNet',
            size: '~100GB',
            format: ['Source Code'],
            taskType: ['code_generation', 'code_completion'],
            domain: 'Code Understanding',
            license: 'Apache 2.0',
            downloadCount: 25000,
            citationCount: 1500,
            qualityScore: 88,
            lastUpdated: '2024',
            features: ['14M samples', '4 languages', 'Problem solutions']
        },
        'tabular': {
            id: 'uci',
            name: 'UCI Machine Learning Repository',
            description: 'Collection of benchmark datasets',
            url: 'https://archive.ics.uci.edu/ml',
            size: 'Various',
            format: ['CSV', 'ARFF'],
            taskType: ['classification', 'regression', 'clustering'],
            domain: 'General',
            license: 'Public Domain',
            downloadCount: 1000000,
            citationCount: 100000,
            qualityScore: 85,
            lastUpdated: '2024',
            features: ['700+ datasets', 'Curated', 'Well-documented']
        },
        'multimodal': {
            id: 'coco',
            name: 'COCO',
            description: 'Common Objects in Context - image dataset with captions',
            url: 'https://cocodataset.org',
            size: '~25GB',
            format: ['JSON', 'JPEG'],
            taskType: ['detection', 'segmentation', 'captioning'],
            domain: 'Computer Vision',
            license: 'Creative Commons',
            downloadCount: 200000,
            citationCount: 30000,
            qualityScore: 94,
            lastUpdated: '2024',
            features: ['330K images', '80 categories', '5 captions/image']
        }
    };
    
    const queryLower = queryText.toLowerCase();
    
    for (const [key, dataset] of Object.entries(datasetPatterns)) {
        if (queryLower.includes(key) || dataset.name.toLowerCase().includes(queryLower)) {
            if (!taskType || dataset.taskType.some(t => t.toLowerCase().includes(taskType.toLowerCase()))) {
                datasets.push({ ...dataset, paperId: undefined, paperTitle: undefined });
            }
        }
    }
    
    return datasets.slice(0, limitCount);
}

export async function getBenchmarkComparison(taskType: string): Promise<BenchmarkInfo[]> {
    const benchmarks: BenchmarkInfo[] = [];
    
    const benchmarkData: Record<string, BenchmarkInfo> = {
        'image_classification': {
            id: 'imagenet-bench',
            name: 'ImageNet Classification',
            description: 'State-of-the-art on ImageNet classification',
            datasetIds: ['imagenet'],
            metrics: ['Top-1 Accuracy', 'Top-5 Accuracy'],
            year: 2024,
            venue: 'Various',
            bestScore: 91.0,
            bestModel: 'ViT-G/14',
            improvementRate: 0.5,
            participants: [
                { model: 'ViT-G/14', organization: 'Google', score: 91.0, date: '2024' },
                { model: 'CoCa', organization: 'Google', score: 90.8, date: '2023' },
                { model: 'SimMIM', organization: 'Microsoft', score: 90.4, date: '2023' }
            ]
        },
        'nlp': {
            id: 'glue-bench',
            name: 'GLUE Benchmark',
            description: 'General language understanding evaluation',
            datasetIds: ['glue'],
            metrics: ['Average Score'],
            year: 2024,
            venue: 'ICLR',
            bestScore: 91.0,
            bestModel: 'DeBERTa-v3',
            improvementRate: 1.2,
            participants: [
                { model: 'DeBERTa-v3', organization: 'Microsoft', score: 91.0, date: '2024' },
                { model: 'RoBERTa', organization: 'Facebook', score: 88.5, date: '2023' },
                { model: 'BERT', organization: 'Google', score: 84.5, date: '2022' }
            ]
        },
        'object_detection': {
            id: 'coco-bench',
            name: 'COCO Object Detection',
            description: 'Object detection benchmark on COCO',
            datasetIds: ['coco'],
            metrics: ['mAP@[.5:.95]', 'mAP@.5'],
            year: 2024,
            venue: 'CVPR',
            bestScore: 64.5,
            bestModel: 'DINO',
            improvementRate: 0.8,
            participants: [
                { model: 'DINO', organization: 'Meta', score: 64.5, date: '2024' },
                { model: 'DETR', organization: 'Facebook', score: 61.3, date: '2023' },
                { model: 'Faster R-CNN', organization: 'Various', score: 59.1, date: '2022' }
            ]
        }
    };
    
    for (const [key, benchmark] of Object.entries(benchmarkData)) {
        if (taskType.toLowerCase().includes(key.split('_')[0])) {
            benchmarks.push(benchmark);
        }
    }
    
    return benchmarks;
}

export async function assessDataQuality(datasetId: string): Promise<DataQualityScore> {
    const qualityScores: Record<string, DataQualityScore> = {
        'imagenet': {
            overall: 95,
            completeness: 98,
            consistency: 94,
            accuracy: 95,
            timeliness: 90,
            issues: [],
            recommendations: ['Consider data augmentation for rare classes', 'Update to latest ImageNet-V2']
        },
        'glue': {
            overall: 92,
            completeness: 95,
            consistency: 90,
            accuracy: 93,
            timeliness: 88,
            issues: ['Some tasks have label noise'],
            recommendations: ['Use ensemble methods to handle noise', 'Consider newer SuperGLUE for harder tasks']
        },
        'default': {
            overall: 80,
            completeness: 85,
            consistency: 75,
            accuracy: 82,
            timeliness: 70,
            issues: ['Missing values in some samples', 'Potential label inconsistencies'],
            recommendations: ['Implement data cleaning pipeline', 'Add validation checks', 'Consider data imputation']
        }
    };
    
    return qualityScores[datasetId] || qualityScores['default'];
}

export async function recommendSyntheticData(
    taskType: string,
    datasetSize: number,
    currentAccuracy: number
): Promise<SyntheticDataRecommendation[]> {
    const recommendations: SyntheticDataRecommendation[] = [];
    
    if (datasetSize < 10000) {
        recommendations.push({
            type: 'augmentation',
            description: 'Data augmentation for limited datasets',
            tools: ['albumentations', 'nlpaug', 'EasyDataAugment'],
            expectedImprovement: '5-15% improvement with augmentation',
            considerations: ['Ensure augmented data maintains semantic meaning', 'Balance between original and augmented data']
        });
    }
    
    if (currentAccuracy < 70) {
        recommendations.push({
            type: 'generation',
            description: 'Synthetic data generation for underrepresented classes',
            tools: ['GANs', 'VAEs', 'Diffusion Models', 'CTGAN'],
            expectedImprovement: '10-20% improvement for minority classes',
            considerations: ['Training stability of generative models', 'Quality assessment of synthetic data']
        });
    }
    
    if (taskType.includes('simulation') || datasetSize < 5000) {
        recommendations.push({
            type: 'simulation',
            description: 'Domain randomization and simulation-to-real transfer',
            tools: ['NVIDIA Isaac Gym', 'Unity ML-Agents', 'PyBullet'],
            expectedImprovement: '15-30% improvement in sim-to-real scenarios',
            considerations: ['Domain gap between simulation and real data', 'Computational cost of simulation']
        });
    }
    
    return recommendations;
}

function deduplicateDatasets(datasets: DatasetInfo[]): DatasetInfo[] {
    const seen = new Set<string>();
    return datasets.filter(dataset => {
        if (seen.has(dataset.id)) return false;
        seen.add(dataset.id);
        return true;
    });
}

export async function findBenchmarkDatasets(benchmarkName: string): Promise<string[]> {
    const benchmarkDatasets: Record<string, string[]> = {
        'GLUE': ['glue'],
        'SuperGLUE': ['super_glue'],
        'ImageNet': ['imagenet'],
        'COCO': ['coco'],
        'SQuAD': ['squad'],
        'MNLI': ['mnli'],
        'BoolQ': ['boolq']
    };
    
    for (const [key, datasets] of Object.entries(benchmarkDatasets)) {
        if (benchmarkName.toLowerCase().includes(key.toLowerCase())) {
            return datasets;
        }
    }
    
    return [];
}

export async function compareDatasetQuality(
    datasetIds: string[]
): Promise<Array<{ datasetId: string; qualityScore: number; strengths: string[]; weaknesses: string[] }>> {
    const comparisons: Array<{ datasetId: string; qualityScore: number; strengths: string[]; weaknesses: string[] }> = [];
    
    const qualityData: Record<string, { qualityScore: number; strengths: string[]; weaknesses: string[] }> = {
        'imagenet': {
            qualityScore: 95,
            strengths: ['Large scale', 'Well-curated', 'Standard benchmark'],
            weaknesses: ['Class imbalance', 'Outdated for some domains']
        },
        'glue': {
            qualityScore: 92,
            strengths: ['Diverse tasks', 'Standardized evaluation', 'Well-documented'],
            weaknesses: ['Some tasks too easy', 'Not representative of real-world']
        },
        'coco': {
            qualityScore: 94,
            strengths: ['Rich annotations', 'Multi-task', 'Widely used'],
            weaknesses: ['Class distribution imbalance', 'Small objects challenging']
        }
    };
    
    for (const datasetId of datasetIds) {
        const data = qualityData[datasetId] || {
            qualityScore: 75,
            strengths: ['Available'],
            weaknesses: ['Unknown quality', 'Limited documentation']
        };
        comparisons.push({ datasetId, ...data });
    }
    
    return comparisons.sort((a, b) => b.qualityScore - a.qualityScore);
}
