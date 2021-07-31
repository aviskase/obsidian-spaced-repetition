import { SRSettings } from "./settings";

interface SRItem {
    dueUnix?: number;
    interval?: number;
    ease?: number;
    uniqueID: string;
}

interface SRCard extends SRItem {
    siblingIdx: number;
    buryDate: string;
    lastUpdated: number;
}

export interface SRFile extends SRItem {
    filename: string;
    lastModified: number;
    cards: Record<string, SRCard>; // Record<uuid, scheduling obj.>
}

export enum ReviewResponse {
    Easy,
    Good,
    Hard,
    Reset,
}

export function schedule(
    response: ReviewResponse,
    interval: number,
    ease: number,
    delayBeforeReview: number,
    settingsObj: SRSettings,
    dueDates?: Record<number, number>
) {
    let lapsesIntervalChange: number = settingsObj.lapsesIntervalChange;
    let easyBonus: number = settingsObj.easyBonus;
    let maximumInterval: number = settingsObj.maximumInterval;

    delayBeforeReview = Math.max(
        0,
        Math.floor(delayBeforeReview / (24 * 3600 * 1000))
    );

    if (response == ReviewResponse.Easy) {
        ease += 20;
        interval = ((interval + delayBeforeReview) * ease) / 100;
        interval *= easyBonus;
    } else if (response == ReviewResponse.Good) {
        interval = ((interval + delayBeforeReview / 2) * ease) / 100;
    } else if (response == ReviewResponse.Hard) {
        ease = Math.max(130, ease - 20);
        interval = Math.max(
            1,
            (interval + delayBeforeReview / 4) * lapsesIntervalChange
        );
    }

    // replaces random fuzz with load balancing over the fuzz interval
    if (dueDates != null) {
        interval = Math.round(interval);
        if (!dueDates.hasOwnProperty(interval)) dueDates[interval] = 0;

        let fuzzRange: [number, number];
        if (interval < 2) fuzzRange = [1, 1];
        else if (interval == 2) fuzzRange = [2, 3];
        else {
            let fuzz: number;
            if (interval < 7) fuzz = 1;
            else if (interval < 30)
                fuzz = Math.max(2, Math.floor(interval * 0.15));
            else fuzz = Math.max(4, Math.floor(interval * 0.05));
            fuzzRange = [interval - fuzz, interval + fuzz];
        }

        for (let ivl = fuzzRange[0]; ivl <= fuzzRange[1]; ivl++) {
            if (!dueDates.hasOwnProperty(ivl)) dueDates[ivl] = 0;
            if (dueDates[ivl] < dueDates[interval]) interval = ivl;
        }

        dueDates[interval]++;
    }

    interval = Math.min(interval, maximumInterval);

    return { interval: Math.round(interval * 10) / 10, ease };
}

export function textInterval(interval: number, isMobile: boolean): string {
    let m: number = Math.round(interval / 3) / 10;
    let y: number = Math.round(interval / 36.5) / 10;

    if (isMobile) {
        if (interval < 30) return `${interval}d`;
        else if (interval < 365) return `${m}m`;
        else return `${y}y`;
    } else {
        if (interval < 30)
            return interval == 1.0 ? "1.0 day" : `${interval} days`;
        else if (interval < 365) return m == 1.0 ? "1.0 month" : `${m} months`;
        else return y == 1.0 ? "1.0 year" : `${y} years`;
    }
}
