Vue.component('pagin', {
	props: ['options'],
	data: function () {
		return {
			startRow: 0,
			visible_count: 10
		}
	},
	computed: {
		rows: function () {
			this.visible_count = this.options.visible_count || this.visible_count;
			return this.options.rows;
		},
		stopRow: function () {
			var count_rows = this.rows.length;
			var visible_count = this.visible_count;
			if (this.startRow < 0) this.startRow = 0;
			var startRow = this.startRow;
			var stopRow = this.startRow + visible_count;
			if (count_rows < stopRow || startRow > count_rows) startRow = count_rows - visible_count;

			this.rows.forEach((r, i) => {
				if (i >= startRow && i < stopRow) {
					Vue.set(r, 'isPaginVisible', true)
				} else {
					Vue.set(r, 'isPaginVisible', false)
				}
			});
			return stopRow;
		}
	},
	template: '<ul v-if="rows.length>visible_count || options.foreverVis" class="pagin_list"><li v-show="startRow>0" @click="startRow-=visible_count"><i class="fa fa-arrow-left" aria-hidden="true"></i></li><li class="pagin_page" v-for="(r,i) in rows" v-if="i%visible_count==0" :class="{active:i>=startRow && i<stopRow}" @click="startRow=i">{{i/visible_count+1}}</li><li v-show="stopRow<rows.length" @click="startRow+=visible_count"><i class="fa fa-arrow-right" aria-hidden="true"></i></li></ul>'
})