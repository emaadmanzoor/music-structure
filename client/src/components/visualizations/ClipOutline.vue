<template>
    <g>
        <rect class="seekerRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized1) * width - 1.25)" :y="isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized1) * height - 1.25) + showMarkerLabel ? 15 : 0
            " :width="4" :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor">
        </rect>
        <!-- <rect class="clipOutlineRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized1) * width - 1.25)"
            :y="isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized1) * height - 1.25) + showMarkerLabel ? 15 : 0
                " :width="(endTimeNormalized1 - startTimeNormalized1) * width - 1.25"
            :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor"></rect> -->
        <rect class="seekerRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : endTimeNormalized1) * width - 1.25)" :y="isVertical * ((useZoom && isZoomed ? 0.5 : endTimeNormalized1) * height - 1.25) + showMarkerLabel ? 15 : 0
            " :width="4" :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor">
        </rect>

        <rect class="seekerRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized2) * width - 1.25)" :y="isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized2) * height - 1.25) + showMarkerLabel ? 15 : 0
            " :width="4" :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor2">
        </rect>
        <!-- <rect class="clipOutlineRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized2) * width - 1.25)"
            :y="isVertical * ((useZoom && isZoomed ? 0.5 : startTimeNormalized2) * height - 1.25) + showMarkerLabel ? 15 : 0
                " :width="(endTimeNormalized2 - startTimeNormalized2) * width - 1.25"
            :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor2"></rect> -->
        <rect class="seekerRect" :x="!isVertical * ((useZoom && isZoomed ? 0.5 : endTimeNormalized2) * width - 1.25)" :y="isVertical * ((useZoom && isZoomed ? 0.5 : endTimeNormalized2) * height - 1.25) + showMarkerLabel ? 15 : 0
            " :width="4" :height="(isVertical ? 2.5 : height * 2) - (showMarkerLabel ? 15 : 0)" :fill="seekerColor2">
        </rect>
    </g>
</template>

<script>

export default {
    props: ["width", "height", "useZoom", "vertical", "color", "showMarkerLabel"],
    data() {
        return {
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        isZoomed() {
            return this.$store.state.isZoomed;
        },
        isVertical() {
            if (this.vertical) {
                return 1;
            } else {
                return 0;
            }
        },
        seekerColor() {
            return "#1D4924";
        },
        seekerColor2() {
            return "#e32e2b";
        },
        startTimeNormalized1() {
            return this.$store.getters.startTime1 / (this.track.getAnalysisDuration() * 1000);
        },
        endTimeNormalized1() {
            return this.$store.getters.endTime1 / (this.track.getAnalysisDuration() * 1000);
        },
        startTimeNormalized2() {
            return this.$store.getters.startTime2 / (this.track.getAnalysisDuration() * 1000);
        },
        endTimeNormalized2() {
            return this.$store.getters.endTime2 / (this.track.getAnalysisDuration() * 1000);
        },
    },
    mounted() {
    },
    methods: {
    },
};
</script>

<style>
.clipOutlineRect {}
</style>
