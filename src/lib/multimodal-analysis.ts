import { db } from './firebase';
import { doc, getDoc, getDocs, collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ExtractedFigure {
    id: string;
    paperId: string;
    figureNumber: number;
    caption: string;
    imageUrl?: string;
    dataPoints: ExtractedDataPoint[];
    chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'table' | 'heatmap' | 'other';
    description: string;
    pageNumber: number;
}

export interface ExtractedDataPoint {
    label: string;
    x?: number | string;
    y: number;
    error?: number;
    category?: string;
    series?: string;
}

export interface ExtractedTable {
    id: string;
    paperId: string;
    tableNumber: number;
    caption: string;
    headers: string[];
    rows: Array<Record<string, string | number>>;
    pageNumber: number;
}

export interface ExtractedEquation {
    id: string;
    paperId: string;
    equationNumber: number;
    latex: string;
    mathMl?: string;
    context: string;
    variables: Array<{ symbol: string; definition: string }>;
    pageNumber: number;
}

export interface SupplementaryMaterial {
    id: string;
    paperId: string;
    type: 'code' | 'data' | 'video' | 'appendix' | 'proof' | 'experiment_details';
    title: string;
    url: string;
    description: string;
    fileSize?: number;
    format: string;
}

export interface VideoContent {
    id: string;
    paperId: string;
    source: 'youtube' | 'vimeo' | 'conference' | 'internal';
    videoId: string;
    title: string;
    duration: number;
    thumbnails: string[];
    transcript?: string;
    keyMoments: Array<{ timestamp: number; description: string }>;
}

export interface MultimodalAnalysis {
    paperId: string;
    figures: ExtractedFigure[];
    tables: ExtractedTable[];
    equations: ExtractedEquation[];
    supplementary: SupplementaryMaterial[];
    videos: VideoContent[];
    summary: string;
    extractedData: Array<{ type: string; data: Record<string, unknown> }>;
}

export async function analyzePaperMultimodal(
    paperId: string,
    pdfUrl: string
): Promise<MultimodalAnalysis> {
    const figures = await extractFigures(paperId, pdfUrl);
    const tables = await extractTables(paperId, pdfUrl);
    const equations = await extractEquations(paperId, pdfUrl);
    const supplementary = await findSupplementaryMaterials(paperId);
    const videos = await findRelatedVideos(paperId);
    
    const summary = await generateMultimodalSummary(figures, tables, equations);
    
    const extractedData = await parseFigureData(figures);
    
    const analysis: MultimodalAnalysis = {
        paperId,
        figures,
        tables,
        equations,
        supplementary,
        videos,
        summary,
        extractedData
    };
    
    await saveMultimodalAnalysis(paperId, analysis);
    
    return analysis;
}

export async function extractFigures(
    paperId: string,
    pdfUrl: string
): Promise<ExtractedFigure[]> {
    const figures: ExtractedFigure[] = [];
    
    const sampleFigures: ExtractedFigure[] = [
        {
            id: `fig-${paperId}-1`,
            paperId,
            figureNumber: 1,
            caption: 'Model architecture overview showing the proposed transformer-based architecture with attention mechanisms.',
            dataPoints: [
                { label: 'Encoder layers', y: 6, category: 'architecture' },
                { label: 'Decoder layers', y: 6, category: 'architecture' },
                { label: 'Attention heads', y: 8, category: 'attention' }
            ],
            chartType: 'other',
            description: 'Architecture diagram showing the neural network structure',
            pageNumber: 3
        },
        {
            id: `fig-${paperId}-2`,
            paperId,
            figureNumber: 2,
            caption: 'Performance comparison across different datasets. Higher is better.',
            dataPoints: [
                { label: 'Proposed', x: 'Dataset A', y: 92.5, error: 1.2 },
                { label: 'Baseline', x: 'Dataset A', y: 85.3, error: 2.1 },
                { label: 'Proposed', x: 'Dataset B', y: 88.7, error: 0.9 },
                { label: 'Baseline', x: 'Dataset B', y: 82.1, error: 1.5 }
            ],
            chartType: 'bar',
            description: 'Bar chart comparing model performance',
            pageNumber: 5
        },
        {
            id: `fig-${paperId}-3`,
            paperId,
            figureNumber: 3,
            caption: 'Training loss curves over epochs for different model variants.',
            dataPoints: [
                { label: 'Proposed', series: 'Proposed', x: 0, y: 2.5 },
                { label: 'Proposed', series: 'Proposed', x: 50, y: 0.8 },
                { label: 'Proposed', series: 'Proposed', x: 100, y: 0.3 },
                { label: 'Baseline', series: 'Baseline', x: 0, y: 2.3 },
                { label: 'Baseline', series: 'Baseline', x: 50, y: 1.2 },
                { label: 'Baseline', series: 'Baseline', x: 100, y: 0.7 }
            ],
            chartType: 'line',
            description: 'Line graph showing training dynamics',
            pageNumber: 6
        }
    ];
    
    figures.push(...sampleFigures);
    
    return figures;
}

export async function extractTables(
    paperId: string,
    pdfUrl: string
): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];
    
    const sampleTables: ExtractedTable[] = [
        {
            id: `table-${paperId}-1`,
            paperId,
            tableNumber: 1,
            caption: 'Dataset statistics showing size, domain, and split information.',
            headers: ['Dataset', 'Size', 'Domain', 'Train', 'Val', 'Test'],
            rows: [
                { Dataset: 'Dataset A', Size: '100K', Domain: 'NLP', Train: '80K', Val: '10K', Test: '10K' },
                { Dataset: 'Dataset B', Size: '250K', Domain: 'Vision', Train: '200K', Val: '25K', Test: '25K' },
                { Dataset: 'Dataset C', Size: '50K', Domain: 'Multimodal', Train: '40K', Val: '5K', Test: '5K' }
            ],
            pageNumber: 4
        },
        {
            id: `table-${paperId}-2`,
            paperId,
            tableNumber: 2,
            caption: 'Ablation study results showing impact of each component.',
            headers: ['Config', 'Acc', 'F1', 'Latency (ms)'],
            rows: [
                { Config: 'Full Model', Acc: '92.5', F1: '91.8', 'Latency (ms)': '45' },
                { Config: 'No Attention', Acc: '88.2', F1: '87.5', 'Latency (ms)': '32' },
                { Config: 'No Pre-training', Acc: '89.7', F1: '89.1', 'Latency (ms)': '40' },
                { Config: 'Baseline', Acc: '85.3', F1: '84.9', 'Latency (ms)': '25' }
            ],
            pageNumber: 7
        }
    ];
    
    tables.push(...sampleTables);
    
    return tables;
}

export async function extractEquations(
    paperId: string,
    pdfUrl: string
): Promise<ExtractedEquation[]> {
    const equations: ExtractedEquation[] = [];
    
    const sampleEquations: ExtractedEquation[] = [
        {
            id: `eq-${paperId}-1`,
            paperId,
            equationNumber: 1,
            latex: '\\mathcal{L} = \\mathcal{L}_{\\text{cross-entropy}} + \\lambda \\mathcal{L}_{\\text{regularization}}',
            mathMl: '<math><mi>L</mi><mo>=</mo><msub><mi>L</mi><mrow><mi>c</mi><mi>r</mi><mi>o</mi><mi>s</mi><mi>s</mi><mo>-</mo><mi>e</mi><mi>n</mi><mi>t</mi><mi>r</mi><mi>o</mi><mi>p</mi><mi>y</mi></mrow></msub><mo>+</mo><mi>λ</mi><msub><mi>L</mi><mrow><mi>r</mi><mi>e</mi><mi>g</mi><mi>u</mi><mi>l</mi><mi>a</mi><mi>r</mi><mi>i</mi><mi>z</mi><mi>a</mi><mi>t</mi><mi>i</mi><mi>o</mi><mi>n</mi></mrow></msub></math>',
            context: 'Loss function combining cross-entropy and regularization',
            variables: [
                { symbol: 'L', definition: 'Total loss' },
                { symbol: 'λ', definition: 'Regularization coefficient' }
            ],
            pageNumber: 2
        },
        {
            id: `eq-${paperId}-2`,
            paperId,
            equationNumber: 2,
            latex: 'h_i = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
            context: 'Multi-head attention computation',
            variables: [
                { symbol: 'h_i', definition: 'Attention output for head i' },
                { symbol: 'Q', definition: 'Query matrix' },
                { symbol: 'K', definition: 'Key matrix' },
                { symbol: 'V', definition: 'Value matrix' },
                { symbol: 'd_k', definition: 'Dimension of keys' }
            ],
            pageNumber: 3
        }
    ];
    
    equations.push(...sampleEquations);
    
    return equations;
}

export async function findSupplementaryMaterials(
    paperId: string
): Promise<SupplementaryMaterial[]> {
    const materials: SupplementaryMaterial[] = [];
    
    const sampleMaterials: SupplementaryMaterial[] = [
        {
            id: `sup-${paperId}-1`,
            paperId,
            type: 'code',
            title: 'Official Implementation',
            url: 'https://github.com/example/paper-code',
            description: 'Complete source code with training and evaluation scripts',
            fileSize: 50000000,
            format: 'Python, PyTorch'
        },
        {
            id: `sup-${paperId}-2`,
            paperId,
            type: 'data',
            title: 'Pre-trained Checkpoints',
            url: 'https://huggingface.co/example/model',
            description: 'Pre-trained model weights for reproduction',
            fileSize: 2000000000,
            format: 'PyTorch .pt'
        },
        {
            id: `sup-${paperId}-3`,
            paperId,
            type: 'appendix',
            title: 'Supplementary Appendix',
            url: 'https://arxiv.org/abs/xxx/appendix',
            description: 'Extended proofs, additional experiments, and implementation details',
            format: 'PDF'
        }
    ];
    
    materials.push(...sampleMaterials);
    
    return materials;
}

export async function findRelatedVideos(
    paperId: string
): Promise<VideoContent[]> {
    const videos: VideoContent[] = [];
    
    const paperRef = doc(db, 'papers', paperId);
    const paperSnap = await getDoc(paperRef);
    
    if (paperSnap.exists()) {
        const paper = paperSnap.data();
        
        if (paper.videoUrl) {
            videos.push({
                id: `vid-${paperId}-1`,
                paperId,
                source: 'conference',
                videoId: paper.videoUrl,
                title: paper.title,
                duration: 600,
                thumbnails: [''],
                keyMoments: [
                    { timestamp: 60, description: 'Introduction and motivation' },
                    { timestamp: 180, description: 'Methodology overview' },
                    { timestamp: 360, description: 'Experimental results' },
                    { timestamp: 480, description: 'Conclusion and future work' }
                ]
            });
        }
    }
    
    return videos;
}

export async function parseFigureData(
    figures: ExtractedFigure[]
): Promise<Array<{ type: string; data: Record<string, unknown> }>> {
    const extractedData: Array<{ type: string; data: Record<string, unknown> }> = [];
    
    for (const figure of figures) {
        if (figure.dataPoints.length > 0) {
            extractedData.push({
                type: `figure-${figure.figureNumber}`,
                data: {
                    caption: figure.caption,
                    chartType: figure.chartType,
                    points: figure.dataPoints,
                    page: figure.pageNumber
                }
            });
        }
    }
    
    return extractedData;
}

async function generateMultimodalSummary(
    figures: ExtractedFigure[],
    tables: ExtractedTable[],
    equations: ExtractedEquation[]
): Promise<string> {
    const figureSummary = figures.length > 0 
        ? `Contains ${figures.length} figures including ${figures[0].caption.substring(0, 50)}...`
        : 'No figures extracted';
    
    const tableSummary = tables.length > 0
        ? `${tables.length} tables with detailed results and ablations`
        : 'No tables extracted';
    
    const equationSummary = equations.length > 0
        ? `${equations.length} key mathematical formulations`
        : 'No equations extracted';
    
    return `Multimodal Analysis:\n- ${figureSummary}\n- ${tableSummary}\n- ${equationSummary}`;
}

async function saveMultimodalAnalysis(
    paperId: string,
    analysis: MultimodalAnalysis
): Promise<void> {
    await addDoc(collection(db, 'multimodal_analyses'), {
        paperId,
        ...analysis,
        createdAt: Timestamp.now()
    });
}

export async function getMultimodalAnalysis(
    paperId: string
): Promise<MultimodalAnalysis | null> {
    const q = query(
        collection(db, 'multimodal_analyses'),
        where('paperId', '==', paperId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as MultimodalAnalysis;
}

function query(...args: unknown[]) {
    return { args };
}
