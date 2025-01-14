import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import HalfMatrix from "./dataStructures/HalfMatrix";
import * as familyFitness from "./familyFitness";

export function createScoreMatrixBuffer(sampleAmount) {
    return new Float32Array(sampleAmount * sampleAmount).fill(Number.NEGATIVE_INFINITY);
}

export function extractPathFamily(ssm, start, end) {
    const { D, width, height, score } = computeAccumulatedScoreMatrix(ssm, start, end, D);
    const pathFamily = computeOptimalPathFamily(D, width, height);
    //const pathScores = getScoresForPathFamily(D, width, pathFamily);
    const pathScores = getBrightnessForPathFamily(ssm, pathFamily, start);

    return [pathFamily, pathScores, score, width];
}

// The ratio between the length of the knight move vs length of a diagonal move
const knightMoveRatio = 1; //Math.sqrt(10) / 2 + .01 ; // plus slight offset to favour diagonal moves when going through penalties
const knightMoveTweak = 1; //0.99; //Also favouring diagonal moves when accumulating score
export function computeAccumulatedScoreMatrix(ssm, start, end, D) {
    const sampleAmount = ssm.getSampleAmount();
    if (start < 0) log.error("start below 0: ", start);
    if (end > sampleAmount) log.error("end above sampleAmount: ", sampleAmount, "end", end);

    const length = end - start;

    const width = length + 1;
    const height = sampleAmount;
    // accumulatedScoreMatrix length + 1 for elevator
    if (!D) {
        D = new Float32Array(height * width).fill(Number.NEGATIVE_INFINITY);
    }

    const penalty = -2;
    const penalize = (value) => {
        return value <= 0 ? penalty : value; //(value-thresh)*(1/(1-thresh));
        //return value < thresh ?  (thresh-value)*(1/thresh)*penalty : (value-thresh)*(1/thresh);
        /*if(value <= 0.5){
             return penalty;
        }else if(value < thresh){
            return  (-thresh+value);
        }else{
            return (value - thresh);
        }*/
    };

    D[0] = 0;
    D[1] = penalize(ssm.getValueNormalized(start, 0));

    for (let y = 1; y < height; y++) {
        D[y * width + 0] = Math.max(D[(y - 1) * width + 0], D[(y - 1) * width + width - 1]);
        D[y * width + 1] = D[y * width + 0] + penalize(ssm.getValueNormalized(start, y));
        for (let x = 2; x < width; x++) {
            let down;
            if (y === 1) {
                down = Number.NEGATIVE_INFINITY;
            } else {
                down = D[(y - 2) * width + x - 1];
            }
            if (down < 0) {
                down *= knightMoveRatio;
            } else {
                down *= knightMoveTweak;
            }
            let right = D[(y - 1) * width + x - 2]; //|| Number.NEGATIVE_INFINITY; // in case undefined
            if (right < 0) {
                right *= knightMoveRatio;
            } else {
                right *= knightMoveTweak;
            }
            const diag = D[(y - 1) * width + x - 1]; //|| Number.NEGATIVE_INFINITY; // in case undefined

            D[y * width + x] = penalize(ssm.getValueNormalized(start + x - 1, y)) + Math.max(diag, right, down);
        }
    }

    const score = Math.max(D[(height - 1) * width + 0], D[(height - 1) * width + width - 1]);

    return { D, width, height, score };
}

export function computeOptimalPathFamily(D, width, height) {
    const pathFamily = [];
    let path = [];

    let y = height - 1;
    let x;
    if (D[y * width + width - 1] < D[y * width + 0]) {
        x = 0;
    } else {
        x = width - 1;
        path.push(x - 1, y);
    }

    // Declaring globally for improved running time
    let predecessors = new Uint16Array(6);
    let predecessorLength = 0; // in pairs, so max would be 3

    while (y > 0 || x > 0) {
        // obtaining the set of possible predecesors given our current position
        predecessors[0] = y - 1;
        predecessors[1] = x - 1;
        if (y <= 2 && x <= 2) {
            predecessorLength = 1;
        } else if (y <= 2 && x > 2) {
            predecessors[2] = y - 1;
            predecessors[3] = x - 2;
            predecessorLength = 2;
        } else if (y > 2 && x <= 2) {
            predecessors[2] = y - 2;
            predecessors[3] = x - 1;
            predecessorLength = 2;
        } else {
            predecessors[2] = y - 2;
            predecessors[3] = x - 1;
            predecessors[4] = y - 1;
            predecessors[5] = x - 2;
            predecessorLength = 3;
        }

        if (y === 0) {
            // case for the first row, only horizontal movements are allowed
            x--;
        } else if (x === 0) {
            // case for the elevator column: we can keep going down the column or jumping to the end of the next row
            if (D[(y - 1) * width + width - 1] > D[(y - 1) * width + 0]) {
                y--;
                x = width - 1;
                if (path.length > 0) {
                    pathFamily.push(path);
                }
                path = [x - 1, y];
            } else {
                y--;
                x = 0;
            }
        } else if (x === 1) {
            // case for x=1, only horizontal steps to the elevator column are allowed
            x = 0;
        } else {
            // regular case, obtain best of predecessors
            let max = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < predecessorLength; i++) {
                let val = D[predecessors[i * 2 + 0] * width + predecessors[i * 2 + 1]]; // value in D of predecessor
                if (val > max) {
                    max = val;
                    y = predecessors[i * 2 + 0];
                    x = predecessors[i * 2 + 1];
                }
            }
            path.push(x - 1, y);
        }
    }
    // add last path to family
    pathFamily.push(path);
    return pathFamily;
}

export function getScoresForPathFamily(scoreMatrix, width, pathFamily) {
    let pathScores = [];
    pathFamily.forEach((path) => {
        const endX = path[0];
        const endY = path[0 + 1];
        const endValue = scoreMatrix[endY * width + endX];
        const startX = path[path.length - 2];
        const startY = path[path.length - 2 + 1];
        const startValue = scoreMatrix[startY * width + startX];
        const pathScore = endValue - startValue;

        pathScores.push(pathScore / width);
    });
    return pathScores;
}

let deb = 0;
export function getBrightnessForPathFamily(pathSSM, pathFamily, start) {
    deb++;
    let pathScores = [];
    pathFamily.forEach((path) => {
        let sum = 0;
        for (let i = 0; i < path.length; i += 2) {
            const x = start + path[i + 0];
            const y = path[i + 1];
            const val = pathSSM.getValueNormalized(x, y);
            sum += val;
        }
        const average = sum / (path.length / 2);
        pathScores.push(average);
    });
    return pathScores;
}

export function getInducedSegments(pathFamily) {
    const pathAmount = pathFamily.length;
    const inducedSegments = new Uint16Array(pathAmount * 2);

    if (pathAmount > 0) {
        for (let p = 0; p < pathAmount; p++) {
            // paths stored in reverse due to backtracking
            const pathEndY = pathFamily[p][1];
            const pathStartY = pathFamily[p][pathFamily[p].length - 1];
            inducedSegments[p * 2] = pathStartY;
            inducedSegments[p * 2 + 1] = pathEndY;
        }
    }

    return inducedSegments;
}

export function visualizationMatrix(ssm, sampleAmount, start, end) {
    const scoreMatrixBuffer = createScoreMatrixBuffer(sampleAmount);
    const { D, width, height, score } = computeAccumulatedScoreMatrix(ssm, start, end, scoreMatrixBuffer);
    const P = computeOptimalPathFamily(D, width, height);
    const PScores = getScoresForPathFamily(D, width, P);
    const { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength } = familyFitness.computeFitness(
        P,
        PScores,
        score,
        sampleAmount,
        width
    );

    let maxVal = Number.NEGATIVE_INFINITY;
    let minVal = Number.POSITIVE_INFINITY;
    const sizeD = width * height;
    for (let i = 0; i < sizeD; i++) {
        if (D[i] > maxVal) {
            maxVal = D[i];
        }

        if (i % width === 0 && D[i] !== Number.NEGATIVE_INFINITY && D[i] < minVal) {
            minVal = D[i];
        }
    }
    minVal = 0;

    const length = end - start + 1;
    const visualizationMatrix = new Matrix({
        width: sampleAmount,
        height: sampleAmount,
        numberType: Matrix.NumberType.UINT8,
    });

    visualizationMatrix.fill((x, y) => {
        if (x >= length * 3 && x < length * 4) {
            return ssm.getValue(start + x - length * 3, y);
        } else if (x >= length * 2) {
            return 0; // Paths will be set from looping over paths
        } else if (x >= length) {
            return (Math.max(0, D[y * width + x - length] - minVal) / (maxVal - minVal)) * 255; // +1 to remove elevator, * 255 sinze value is
        } else {
            return ssm.getValue(start + x, y);
        }
    });

    for (const path of P) {
        for (let i = 0; i < path.length / 2; i++) {
            const x = length * 2 + path[i * 2];
            const y = path[i * 2 + 1];
            visualizationMatrix.setValue(x, y, 255);
            const x2 = length * 3 + path[i * 2];
            visualizationMatrix.setValue(x2, y, 0);
        }
    }

    return visualizationMatrix;
}

export function getInducedSegmentsFromSampleRange(start, end, pathSSM) {
    const { D, width, height, score } = computeAccumulatedScoreMatrix(pathSSM, start, end);
    const pathFamily = computeOptimalPathFamily(D, width, height);
    const inducedSegments = getInducedSegments(pathFamily);
    return inducedSegments;
}

export function getDistanceBetween(segmentA, segmentB, pathSSM) {
    const startSampleA = Math.floor(segmentA.start / pathSSM.getSampleDuration());
    const endSampleA = Math.floor(segmentA.end / pathSSM.getSampleDuration());

    const startSampleB = Math.floor(segmentB.start / pathSSM.getSampleDuration());
    const endSampleB = Math.floor(segmentB.end / pathSSM.getSampleDuration());

    const inducedSegmentsA = getInducedSegmentsFromSampleRange(startSampleA, endSampleA, pathSSM);
    const inducedSegmentsB = getInducedSegmentsFromSampleRange(startSampleB, endSampleB, pathSSM);

    return segmentDistanceOverlap(inducedSegmentsA, inducedSegmentsB);
}

export function segmentSimilarityDTW(segmentA, segmentB, ssm) {
    const startSampleA = Math.floor(segmentA.start / ssm.getSampleDuration());
    const endSampleA = Math.floor(segmentA.end / ssm.getSampleDuration());
    const height = endSampleA - startSampleA + 1;

    const startSampleB = Math.floor(segmentB.start / ssm.getSampleDuration());
    const endSampleB = Math.floor(segmentB.end / ssm.getSampleDuration());
    const width = endSampleB - startSampleB + 1;

    const D = new Float32Array(height * width).fill(Number.NEGATIVE_INFINITY);

    const penalty = 0;
    const penalize = (value) => {
        return value <= 0 ? penalty : value;
    };

    D[0] = penalize(ssm.getValueNormalized(startSampleA, startSampleB));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (y === 0 && x === 0) continue;
            let down = y - 2 >= 0 && x - 1 >= 0 ? D[(y - 2) * width + x - 1] : Number.NEGATIVE_INFINITY;
            let right = y - 1 >= 0 && x - 2 >= 0 ? D[(y - 1) * width + x - 2] : Number.NEGATIVE_INFINITY;
            let diag = y - 1 >= 0 && x - 1 >= 0 ? D[(y - 1) * width + x - 1] : Number.NEGATIVE_INFINITY;

            D[y * width + x] =
                penalize(ssm.getValueNormalized(startSampleB + x, startSampleA + y)) + Math.max(diag, right, down);
        }
    }

    const score = D[D.length - 1];
    if (score <= 0) return 0;

    let x = width - 1;
    let y = height - 1;
    let pathLength = 1;
    while (x > 0 || y > 0) {
        let down = y - 2 >= 0 && x - 1 >= 0 ? D[(y - 2) * width + x - 1] : Number.NEGATIVE_INFINITY;
        let right = y - 1 >= 0 && x - 2 >= 0 ? D[(y - 1) * width + x - 2] : Number.NEGATIVE_INFINITY;
        let diag = y - 1 >= 0 && x - 1 >= 0 ? D[(y - 1) * width + x - 1] : Number.NEGATIVE_INFINITY;

        if (x === 0) {
            x--;
        } else if (y === 0) {
            y--;
        } else if (down >= right && down >= diag) {
            y -= 2;
            x -= 1;
        } else if (right >= down && right >= diag) {
            y -= 1;
            x -= 2;
        } else if (diag >= down && diag >= right) {
            y -= 1;
            x -= 1;
        }
        pathLength++;
    }
    const similarity = score / pathLength;

    return similarity;
}

/**
 * Similar if they are aproximately repetitions of each other (overlap)
 * @param inducedSegmentsA in the form of a flat Uint16Array with pairs of start and end position of segments
 */
export function segmentDistanceOverlap(inducedSegmentsA, inducedSegmentsB) {
    let maxSimilarity = 0;
    for (let a = 0; a < inducedSegmentsA.length; a += 2) {
        for (let b = 0; b < inducedSegmentsB.length; b += 2) {
            const startA = inducedSegmentsA[a];
            const endA = inducedSegmentsA[a + 1];
            const startB = inducedSegmentsB[b];
            const endB = inducedSegmentsB[b + 1];

            const disjoint = endA <= startB || endB <= startA;
            if (disjoint) continue;

            const smallestStart = Math.min(startA, startB);
            const largestEnd = Math.max(endA, endB);
            const union = largestEnd - smallestStart;

            const smallestEnd = Math.min(endA, endB);
            const largestStart = Math.max(startA, startB);
            const overlap = smallestEnd - largestStart;
            const similarity = overlap / union;

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
    }
    return 1 - maxSimilarity;
}

let logi = 0;
export function computeSegmentPathFamilyInfo(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer, strategy) {
    logi++;
    const sampleAmount = pathSSM.getSampleAmount();
    if (!scoreMatrixBuffer) {
        scoreMatrixBuffer = createScoreMatrixBuffer(sampleAmount);
    }
    const [P, pathScores, score, width] = extractPathFamily(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer);

    const fitnessFunction = (strategy, P, pathScores, score, sampleAmount, width) => {
        switch (strategy) {
            case "classic":
                return familyFitness.computeFitness(P, pathScores, score, sampleAmount, width);
            case "fine":
                return familyFitness.computeFineFitness(P, pathScores, score, sampleAmount, width);
            case "pruned":
                return familyFitness.computePrunedFitness(P, pathScores, score, sampleAmount, width);
            case "custom":
                return familyFitness.computeCustomFitness(P, pathScores, score, sampleAmount, width);
            case "customPruned":
                return familyFitness.computeCustomPrunedFitness(P, pathScores, score, sampleAmount, width);
            default:
                log.error("No fitness strategy given, falling back to classic");
                return familyFitness.computeFitness(P, pathScores, score, sampleAmount, width);
        }
    };

    const {
        fitness,
        normalizedScore,
        coverage,
        normalizedCoverage,
        pathFamilyLength,
        prunedPathFamily,
        prunedPathScores,
    } = fitnessFunction(strategy, P, pathScores, score, sampleAmount, width);

    const pathFamily = [];
    prunedPathFamily.forEach((path) => {
        const pathCoords = [];
        for (let i = 0; i < path.length; i += 2) {
            const x = startInSamples + path[i];
            const y = path[i + 1];
            pathCoords.push([x, y]);
        }
        pathFamily.push(pathCoords);
    });

    return {
        score: score,
        pathScores: pathScores,
        normalizedScore: normalizedScore,
        coverage: coverage,
        normalizedCoverage: normalizedCoverage,
        fitness: fitness,
        pathFamily: pathFamily,
    };
}

export function simplePathDetect(pathSSM, threshold = 0.1) {
    const size = pathSSM.getSize();
    const paths = [];

    for (let y = 0; y < size; y++) {
        let path = [];
        for (let i = 0; i + y < size; i++) {
            const value = pathSSM.getValueNormalized(i, i + y);
            if (value > threshold) {
                path.push(i, i + y);
            }
        }
    }
}

export function getDistanceMatrix(segments, pathSSM, strategy, kappa = 0.7) {
    const amount = segments.length;
    const distanceMatrix = new HalfMatrix({ size: amount, numberType: HalfMatrix.NumberType.FLOAT32 });

    const segmentInducedSegments = [];

    segments.forEach((segment) => {
        const sampleStart = Math.floor(segment.start / pathSSM.getSampleDuration());
        const sampleEnd = Math.floor(segment.end / pathSSM.getSampleDuration());
        const inducedSegments = getInducedSegmentsFromSampleRange(sampleStart, sampleEnd, pathSSM);
        segmentInducedSegments.push(inducedSegments);
    });
    distanceMatrix.fill((x, y) => {
        let dist = 0;
        const sameGroup = segments[x].groupID === segments[y].groupID;
        switch (strategy) {
            case "DTW":
                dist = (1 - segmentSimilarityDTW(segments[x], segments[y], pathSSM)) * (sameGroup ? kappa : 1);
                //dist = Math.max(0, (1 - segmentSimilarityDTW(segments[x], segments[y], pathSSM) - 0.5) * 2);
                //dist = 1 / (1 + segmentSimilarityDTW(segments[x], segments[y], pathSSM));
                break;
            case "overlap":
                dist = segmentDistanceOverlap(segmentInducedSegments[x], segmentInducedSegments[y]);
                break;
        }
        return dist;
    });
    return distanceMatrix;
}
