<template>
  <div id='gridBase'>
    <button class='button top'
            style='top: 10px; left: 10px; background-color: #42b983; width: 100px'
            @click='showGrid = !showGrid'
    >
      Show Grid
    </button>
    <button class='button top'
            style='top: 10px; left: 120px; background-color: #42b983; width: 100px'
            @click='start'
    >
      Start Tracking
    </button>
    <button class='button top'
            style='top: 10px; left: 230px; background-color: #42b983; width: 100px'
            @click='stop'
    >
      Stop Tracking
    </button>
    <button class='button top'
            style='top: 10px; left: 340px; background-color: #42b983; width: 100px'
            @click='showImportantInteractions = !showImportantInteractions'
    >
      Show Important Cells
    </button>
    <button class='button top'
            style='top: 10px; left: 450px; background-color: #42b983; width: 100px'
            @click='showPattern = !showPattern'
    >
      Show Patterns
    </button>

    <div class="numberSpinner"
         v-if="currentInteraction > 0"
         style='top: 10px; left: 560px;'
    >
      <label class="spinnerLabel">Current Interaction:</label>
      <div class="spinnerContent">
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

    <div class="numberSpinner"
         style='top: 80px; left: 10px;'
    >
      <label class="spinnerLabel">Amount of Columns:</label>
      <div class="spinnerContent left">
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='decCells'
        >
          -
        </button>
        <input
          type="number"
          :value="amountCellsPerRow"
        >
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='incCells'
        >
          +
        </button>
      </div>
    </div>

    <div class="numberSpinner"
         style='top: 140px; left: 10px;'
    >
      <label class="spinnerLabel">
        Amount consecutive <br>
        samples for important <br>
        Cell (10 = 1 second)
      </label>
      <div class="spinnerContent left">
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='decImportantCell'
        >
          -
        </button>
        <input
          type="number"
          :value="minAmountPerCell"
        >
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='incImportantCell'
        >
          +
        </button>
      </div>
    </div>

    <div class="numberSpinner"
         style='top: 260px; left: 10px;'
    >
      <label class="spinnerLabel">Fan out factor:</label>
      <div class="spinnerContent left">
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='decFOF'
        >
          -
        </button>
        <input
          type="number"
          :value="fanOutFactor"
        >
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='incFOF'
        >
          +
        </button>
      </div>
    </div>

    <div class="numberSpinner"
         style='top: 320px; left: 10px;'
    >
      <label class="spinnerLabel">
        Pattern find factor % <br>
        (has to appear in <br>
        this % of interactions):
      </label>
      <div class="spinnerContent left">
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='decPattern'
        >
          -
        </button>
        <input
          type="number"
          :value="minMatchingFactor"
        >
        <button class='button'
                style='color: white; background-color: #42b983;'
                @click='incPattern'
        >
          +
        </button>
      </div>
    </div>

    <button class='button  top'
            style='color: white; background-color: #42b983; top: 440px; left: 10px;'
            @click='recalculate'
    >
      Recalculate
    </button>

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
            :style="{
              fill: 'orangered',
              'fill-opacity': 1/interactions[currentInteraction - 1].importantCells.length,
            }"
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
            :style="{ fill: 'orangered', 'fill-opacity': 1/patterns.cells.length }"
      ></rect>

      <defs>
        <marker id="arrowheadPattern" markerWidth="8" markerHeight="8"
                refX="7" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="red"/>
        </marker>
      </defs>

      <line class="vector"
            v-for="(vector, index) in patterns.vectorPairs"
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

@Component
export default class GridViewer extends Vue {
  @Prop() private msg!: string;

  showGrid = false;

  showImportantInteractions = false;

  showPattern = false;

  interactions: Interaction[] = [];

  currentInteraction = 0;

  minAmountPerCell = 20;

  fanOutFactor = 5;

  amountCellsPerRow = 20;

  samplingInterval = 1000 / 10;

  minMatchingFactor = 50;

  database = createPatternDatabase();

  gridManager = createGridManager(
    this.database,
    this.minAmountPerCell,
    this.fanOutFactor,
    this.amountCellsPerRow,
    this.samplingInterval,
    this.minMatchingFactor / 100,
  );

  grid: Grid = this.gridManager.calculateGrid();

  patterns: Patterns = this.gridManager.getPatterns();

  // eslint-disable-next-line
  start() {
    this.gridManager.startMouseTracker();
  }

  // eslint-disable-next-line
  stop() {
    this.gridManager.stopMouseTracker();
    this.interactions.splice(0);
    this.interactions.push(...this.gridManager.getInteractions());
    this.currentInteraction = (this.interactions.length && this.interactions.length > 0)
      ? this.interactions.length
      : 0;
    this.patterns = this.gridManager.getPatterns();
  }

  recalculate() {
    this.interactions.splice(0);
    this.interactions.push(...this.gridManager.recalculateInteractionsWith(
      this.minAmountPerCell,
      this.fanOutFactor,
      this.amountCellsPerRow,
      this.samplingInterval,
      this.minMatchingFactor / 100,
    ));
    this.grid = this.gridManager.calculateGrid();
    this.patterns = this.gridManager.getPatterns();
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

  incCells() {
    this.amountCellsPerRow += 1;
  }

  decCells() {
    this.amountCellsPerRow = Math.max(this.amountCellsPerRow - 1, 1);
  }

  incImportantCell() {
    this.minAmountPerCell += 1;
  }

  decImportantCell() {
    this.minAmountPerCell = Math.max(this.minAmountPerCell - 1, 1);
  }

  incFOF() {
    this.fanOutFactor += 1;
  }

  decFOF() {
    this.fanOutFactor = Math.max(this.fanOutFactor - 1, 1);
  }

  incPattern() {
    this.minMatchingFactor = Math.min(this.minMatchingFactor + 1, 100);
  }

  decPattern() {
    this.minMatchingFactor = Math.max(this.minMatchingFactor - 1, 1);
  }

  created() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  handleResize() {
    this.gridManager.setWindowSize(window.innerWidth, window.innerHeight);
    this.grid = this.gridManager.calculateGrid();
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
  color: white;
  font-weight: bold;
}

.button.top {
  height: 60px;
}

.numberSpinner {
  position: absolute;
  z-index: 100;
}

.spinnerLabel, .spinnerContent {
  display:block;
}

.spinnerContent.left {
  float:left;
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
