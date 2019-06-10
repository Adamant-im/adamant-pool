Vue.component('pagin', {
    props: ['options'],
    data: function () {
        return {
            startRow: 0,
            visible_count: 10,
            count_buttons_show: 6,
            countButtons: 0,
            lastNumButton: 0
        };
    },
    created () {
        this.visible_count = this.options.visible_count || this.visible_count;
        this.count_buttons_show = this.options.visible_count || this.visible_count;
        if (this.count_buttons_show % 2) {
            this.count_buttons_show++;
        }
        this.count_buttons_show /= 2;
    },
    computed: {
        rows: function () {
            return this.options.rows;
        },
        stopRow: function () {
            var count_rows = this.rows.length;
            var visible_count = this.visible_count;
            if (this.startRow < 0) {
                this.startRow = 0;
            }
            var startRow = this.startRow;
            var stopRow = this.startRow + visible_count;
            if (count_rows < stopRow || startRow > count_rows) {
                startRow = count_rows - visible_count;
            }
            this.countButtons = Math.floor(count_rows / visible_count);
            this.lastNumButton = this.countButtons * visible_count;
            let currentButtonNumber = startRow / this.visible_count + 1;

            this.rows.forEach((r, i) => {
                currentButtonNumber = Math.max(currentButtonNumber, this.count_buttons_show / 2 + 1);
                Vue.set(r, '_numberButton', i / this.visible_count + 1);

                if (currentButtonNumber - this.count_buttons_show / 2 <= r._numberButton &&
                    currentButtonNumber + this.count_buttons_show / 2 >= r._numberButton &&
                    i % this.visible_count === 0) {
                    Vue.set(r, '_buttonIsShow', true);
                } else {
                    Vue.set(r, '_buttonIsShow', false);
                }

                if (i >= startRow && i < stopRow) {
                    Vue.set(r, 'isPaginVisible', true);
                } else {
                    Vue.set(r, 'isPaginVisible', false);
                }
            });
            return stopRow;
        }
    },
    template: /*html*/ `
    <ul class="pagin_list">
     <span v-if="rows.length>visible_count || options.foreverVis">
         <li v-show="startRow>0"
             @click="startRow-=visible_count">
         <i class="fa fa-arrow-left" aria-hidden="true"></i>
         </li>

         <li class="pagin_page"
             v-for="(r, i) in rows" v-if="r._buttonIsShow || i === 0 || i === lastNumButton"
             :class="{active:i>=startRow && i < stopRow}"
             @click="startRow = i">
             {{i === lastNumButton && !rows[lastNumButton]._buttonIsShow ? '... ' : ''}}
             {{r._numberButton}}
             {{i === 0 && !rows[0]._buttonIsShow ? ' ...' : ''}}
         </li>

         <li v-show="stopRow < rows.length"
                 @click="startRow+=visible_count">
         <i class="fa fa-arrow-right"aria-hidden="true"></i>
         </li>
     </span>
     </ul>`
});
