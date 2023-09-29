<template>
  <div>
    <v-slide-group v-model="selected" center-active class="pt-2" v-on:scroll.native="onScroll" mandatory>
      <v-slide-item v-for="(track, index) in tracks" :key="index" v-slot:default="{ active, toggle }" class="mx-2 my-1">
        <Album :album="track.trackData" :imgSize="active ? albumSize * 1.5 : albumSize" :active="active" @clicked="toggle"
          @clickedArtist="clickedArtist(track)" @drawClipOutlines="drawClipOutlines(track)" />
      </v-slide-item>
    </v-slide-group>
  </div>
</template>

<script>
import Album from "../components/Album";
import * as app from "../app/app";
import * as log from "../dev/log";

export default {
  name: "TrackSelector",
  props: ["tracks", "albumSize"],
  components: {
    Album,
  },
  data() {
    return {
      selected: 0,
    };
  },
  computed: {
    selectedFromStore() {
      return this.$store.getters.selectedIndex;
    },
  },
  watch: {
    selected: "selectedChanged",
    selectedFromStore: "selectedFromStoreChanged",
  },
  mounted() { },
  methods: {
    selectedChanged(newIndex, oldIndex) {
      app.selectTrackAtIndex(newIndex);
    },
    selectedFromStoreChanged(newIndex, oldIndex) {
      this.selected = newIndex;
    },
    clickedArtist(track) {
      log.debug("Clicked Artist", track);
      app.loadArtistTopTracks(track.trackData.artists[0].id);
    },
    drawClipOutlines(track) {
      const clips = this.$store.getters['clipStore/allClips'];

      let returnClips = [];
      for (let i = 0; i < clips.length; i++) {
        if (clips[i].songId === track.trackData.id) {
          returnClips.push(clips[i]);
        }
      }

      if (returnClips.length > 0) {
        this.$store.commit("setStartTime1", returnClips[0].startTime);
        this.$store.commit("setStartTime2", returnClips[1].startTime);
        this.$store.commit("setEndTime1", returnClips[0].endTime);
        this.$store.commit("setEndTime2", returnClips[1].endTime);
      } else {
        this.$store.commit("setStartTime1", 0);
        this.$store.commit("setStartTime2", 0);
        this.$store.commit("setEndTime1", 0);
        this.$store.commit("setEndTime2", 0);
      }


    },
  },
};
</script>
