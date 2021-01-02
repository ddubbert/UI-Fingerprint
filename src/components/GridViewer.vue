<template>
  <div id='gridBase'>
    <button class='button'
            style='top: 10px; left: 0; background-color: #42b983; width: 100px'
            @click='showGrid = !showGrid'
    >
      Show Grid
    </button>
    <button class='button'
            style='top: 10px; left: 110px; background-color: #42b983; width: 100px'
            @click='start'
    >
      Start Tracking
    </button>
    <button class='button'
            style='top: 10px; left: 220px; background-color: #42b983; width: 100px'
            @click='stop'
    >
      Stop Tracking
    </button>
    <button class='button'
            style='top: 10px; left: 330px; background-color: #42b983; width: 100px'
            @click='showImportantInteractions = !showImportantInteractions'
    >
      Show Important Cells
    </button>
    <button class='button'
            style='top: 10px; left: 440px; background-color: #42b983; width: 100px'
            @click='showPattern = !showPattern'
    >
      Show Patterns
    </button>

    <div id="numberSpinner"
         v-if="currentInteraction > 0"
         style='top: 10px; left: 550px;'
    >
      <label id="spinnerLabel">Current Interaction:</label>
      <div id="spinnerContent">
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='decIndex'
        >
          -
        </button>
        <input
          type="number"
          :value="currentInteraction"
        >
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='incIndex'
        >
          +
        </button>
      </div>
    </div>

    <svg id='gridView' v-if='showGrid'>
      <line v-for="(column, index) in grid.columns"
            :key="'column' + index"
            :x1="column.x"
            y1="0"
            :x2="column.x"
            :y2="column.height"
            stroke="black"
      ></line>

      <line v-for="(row, index) in grid.rows"
            :key="'row' + index"
            x1="0"
            :y1="row.y"
            :x2="row.width"
            :y2="row.y"
            stroke="black"
      ></line>
    </svg>

    <svg id='cellView' v-if='
      showImportantInteractions && currentInteraction > 0'>
      <rect v-for="(cell, index) in interactions[currentInteraction - 1].importantCells"
            :key="'cell' + index"
            :x="cell.x"
            :y="cell.y"
            :width="cell.size"
            :height="cell.size"
            style="fill:orangered;fill-opacity:0.1"
      ></rect>

      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6"
                refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="blue"/>
        </marker>
      </defs>

      <line class="vector"
            v-for="(vector, index) in interactions[currentInteraction - 1].importantVectors"
            :key="'vector' + index"
            :x1="vector.start.x"
            :y1="vector.start.y"
            :x2="vector.end.x"
            :y2="vector.end.y"
            stroke="blue"
            stroke-width="2px"
            :stroke-opacity="vector.importance"
            marker-end="url(#arrowhead)"
      ></line>
    </svg>

    <svg id='patternView' v-if='showPattern && currentInteraction > 0'>
      <rect v-for="(cell, index) in patterns.cells"
            :key="'cell' + index"
            :x="cell.x"
            :y="cell.y"
            :width="cell.size"
            :height="cell.size"
            style="fill:orangered;fill-opacity:0.1"
      ></rect>

      <defs>
        <marker id="arrowheadPattern" markerWidth="8" markerHeight="8"
                refX="7" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="red"/>
        </marker>
      </defs>

      <line class="vector"
            v-for="(vector, index) in patterns.vectors"
            :key="'pattern' + index"
            :x1="vector.start.x"
            :y1="vector.start.y"
            :x2="vector.end.x"
            :y2="vector.end.y"
            stroke="red"
            stroke-width="4px"
            :stroke-opacity="vector.importance"
            marker-end="url(#arrowheadPattern)"
      ></line>
    </svg>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import {
  createGridManager,
  Grid,
  Interaction,
} from '@/models/GridManager';
import {
  createPatternDatabase,
  Patterns,
} from '@/models/PatternDatabase';

const database = createPatternDatabase();
const gridManager = createGridManager(database);

@Component
export default class GridViewer extends Vue {
  @Prop() private msg!: string;

  showGrid = false;

  showImportantInteractions = false;

  showPattern = false;

  grid: Grid | undefined = undefined;

  interactions: Interaction[] | undefined = undefined;

  currentInteraction = 0;

  patterns: Patterns | undefined = undefined;

  // eslint-disable-next-line
  start() {
    gridManager.startMouseTracker();
  }

  // eslint-disable-next-line
  stop() {
    gridManager.stopMouseTracker();
    this.interactions = gridManager.getInteractions();
    this.currentInteraction = (this.interactions.length && this.interactions.length > 0)
      ? this.interactions.length
      : 0;
    this.patterns = gridManager.getPatterns();
  }

  incIndex() {
    if (this.currentInteraction > 0) {
      const newIndex = this.currentInteraction + 1;
      this.currentInteraction = (this.interactions && newIndex > this.interactions.length)
        ? 1
        : newIndex;
    }
  }

  decIndex() {
    if (this.currentInteraction > 0) {
      const newIndex = this.currentInteraction - 1;
      this.currentInteraction = (newIndex > 0) ? newIndex : this.interactions.length;
    }
  }

  created() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  handleResize() {
    gridManager.setWindowSize(window.innerWidth, window.innerHeight);
    this.grid = gridManager.calculateGrid();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#gridView {
  width: 100%;
  height: 100%;
  z-index: 98;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

#cellView {
  width: 100%;
  height: 100%;
  z-index: 99;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

#patternView {
  width: 100%;
  height: 100%;
  z-index: 99;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

#gridBase {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.button {
  position: absolute;
  z-index: 100;
  pointer-events: all;
  cursor: pointer;
}

#numberSpinner {
  position: absolute;
  z-index: 100;
}

#spinnerLabel, #spinnerContent {
  display:block;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input {
  text-align:center;
}

.vector {
  fill: none;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 11, 5;
}
</style>
