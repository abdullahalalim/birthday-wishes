/*
acarousel 1.0.0
(c)2014 aslider team
Released under the MIT license
*/
(function ($) {
$.fn.extend({
acarousel: function (option) {
	var el = $(this).eq(0);

	var el_func = el.data("el_func");
	if (el_func != null) {
		// 生成済みなのでそれを再利用する
		el_func.option = $.extend(el_func.option, option);
		el_func.init();
		return el_func;
	}

	var elc, elc_cnt;
	var elc_prop_list, elc_pos = 0;
	var el_timer = null;

	if (el.css("position") == "static") el.css("position", "relative");

	// 外部から呼び出し可能メソッド等の宣言
	el_func = {
		// オプション
		option: {
			move_minimum: false	// 移動量を最小にするか
			, moveBefore: function () {}	// アニメーション前に実行
			, moveStep: function (elem, index, pos_index, t) {}	// アニメーション中の毎フレーム実行
			, moveAfter: function () {}	// アニメーション後に実行
		}

		// 初期化
		, init: function () {
			elc = el.children().removeAttr("style");
			elc_cnt = elc.length;
			elc_prop_list = [];

			if (elc_cnt == 0) return;
			var i;

			// opacityが変化している場合、変化リストに登録されるようにする
			var opacity_flag = false;
			var opacity = elc.eq(0).css("opacity");
			for (i = 1; i < elc_cnt; i++) {
				if (opacity == elc.eq(i).css("opacity")) continue;
				opacity_flag = true;
				break;
			}

			// 要素変化リスト生成
			for (i = 0; i < elc_cnt; i++) {
				var prop = {
					width: parseFloat(elc.eq(i).width())
					, height: parseFloat(elc.eq(i).height())
					, left: parseFloat(elc.eq(i).css("left"))
					, top: parseFloat(elc.eq(i).css("top"))
					, zIndex: elc.eq(i).css("zIndex")
					, visible: elc.eq(i).is(":visible")
				};
				if (opacity_flag) prop.opacity = parseFloat(elc.eq(i).css("opacity"));
				elc_prop_list.push(prop);
			};

			setPos(elc_pos);
		}

		// 要素の移動
		, move: function (move_pos, duration, easing) {
			if (elc_cnt == 0 || !$.isNumeric(move_pos)) return 0;
			this.stop();

			if (this.option.move_minimum) move_pos %= elc_cnt;

			// easingの設定
			easing = $.easing[(easing in $.easing) && easing || easing == null && (duration in $.easing) && !(duration in $.fx.speeds) && duration || "swing"];

			// durationの設定
			if (move_pos == 0) {
				duration = 1;
			} else if ($.isNumeric(duration)) {
				if (duration <= 0) duration = 1;
			} else {
				duration = $.fx.speeds[(duration in $.fx.speeds) && duration || "_default"];
			}

			var base_pos = elc_pos;	// アニメーション前の現在位置を設定
			var self = this;
			var time = null, start_time;

			// アニメーション
			this.option.moveBefore();
			step();
			return move_pos;
			function step() {
				time = time == null ? (duration > 1 ? 0 : 1) : time + (new Date().getTime() - start_time);
				start_time = new Date().getTime();
				if (time < 0 || time > duration) time = duration;

				setPos(base_pos + move_pos * easing(time / duration, time, 0, 1, duration));

				if (time < duration) {
					el_timer = setTimeout(step, $.fx.interval);
				} else {
					self.stop();
					self.option.moveAfter();
				}
			}
		}

		// 指定した要素インデックスindexへ移動する
		, moveByIndex: function (index, duration, easing) {
			if (index < 0) return 0;
			return this.move(getPosDiff(index), duration, easing);
		}

		// 指定した要素へ移動する
		, moveByElem: function (elem, duration, easing) {
			var index = elc.index(elem);
			if (index < 0) return 0;
			return this.move(getPosDiff(index), duration, easing);
		}

		// スライドアニメーション
		, slide: function (duration) {
			if (elc_cnt == 0 || !$.isNumeric(duration) || duration == 0) return;
			this.stop();

			var base_pos = elc_pos;	// アニメーション前の現在位置を設定
			var self = this;
			var time = null, start_time;

			// アニメーション
			this.option.moveBefore();
			step();
			function step() {
				time = time == null ? 0 : time + (new Date().getTime() - start_time);
				start_time = new Date().getTime();

				setPos(base_pos + time / duration);
				el_timer = setTimeout(step, $.fx.interval);
			}
		}

		// アニメーション停止
		, stop: function () {
			if (el_timer == null) return;
			clearTimeout(el_timer);
			el_timer = null;
		}

		// アニメーション中かどうか
		, isAnim: function () {
			return el_timer != null;
		}

		// 要素数を取得
		, count: function () {
			return elc_cnt;
		}

		// 現在位置を取得
		, getPos: function (offset) {
			return toPos(-(elc_pos + ($.isNumeric(offset) ? offset : 0)));
		}
	};

	el_func.option = $.extend(el_func.option, option);
	el_func.init();

	el.data("el_func", el_func);
	return el_func;

	//----------

	// 位置設定
	//  asliderと同様の仕様だが、elc_posに設定されるのは要素インデックス0の現在位置となるため、
	//  選択中と見なす位置を取得する方法はel_func.getPosを参照
	function setPos(pos) {
		if (elc_cnt == 0) return;

		for (var i = 0; i < elc_cnt; i++) {
			// 位置を決める基準を設定
			var from_pos = toPos(pos + i);
			var to_pos = toPos(pos + 1 + i);
			var from = elc_prop_list[from_pos.index];
			var to = elc_prop_list[to_pos.index];

			if (i == 0) elc_pos = from_pos.index + from_pos.point;	// 現在位置を設定

			// いくつかの設定値を現在位置より計算
			var prop = {
				width: calcProg(from.width, to.width, from_pos.point)
				, height: calcProg(from.height, to.height, from_pos.point)
				, left: calcProg(from.left, to.left, from_pos.point)
				, top: calcProg(from.top, to.top, from_pos.point)
				, zIndex: from_pos.point < 0.5 ? from.zIndex : to.zIndex
			};
			if (from.opacity != null) prop.opacity = calcProg(from.opacity, to.opacity, from_pos.point);

			elc.eq(i).css(prop);
			if (from.visible) {
				elc.eq(i).show();
			} else {
				elc.eq(i).hide();
			}

			el_func.option.moveStep(elc.eq(i), i, from_pos.index, from_pos.point);
		}
	}

	// 引数posを適切な位置情報に変換してそれを取得
	function toPos(pos) {
		if (elc_cnt == 0) return {index: 0, point: 0};

		// 精度調整
		var float = modf(pos);
		pos = float.int + (pos < 0 ? -float.point : float.point);

		var index = Math.floor(pos);
		if (pos < 0) {
			return {
				index: (elc_cnt + index % elc_cnt) % elc_cnt
				, point: pos - index
			};
		} else {
			return {
				index: index % elc_cnt
				, point: pos - index
			};
		}
	}

	// 現在位置までの差の少ない方を返す
	function getPosDiff(index) {
		if (elc_cnt == 0) return 0;

		var pos = el_func.getPos();
		pos = pos.index + pos.point;

		var diff1 = toPos(pos - index);
		diff1 = diff1.index + diff1.point;

		var diff2 = toPos(index - pos);
		diff2 = -(diff2.index + diff2.point);

		return Math.abs(diff1) > Math.abs(diff2) ? diff2 : diff1;
	}

	// 整数部と小数部を返す
	function modf(val) {
		var int = val < 0 ? Math.ceil(val) : Math.floor(val);

		// 精度調整
		var point = Math.abs(val - int);
		if (point < 0.0000000001) {
			point = 0;
		} else if (point > 0.9999999999) {
			int += val < 0 ? -1 : 1;
			point = 0;
		}

		return {int: int, point: point};
	}

	// 進行度計算
	function calcProg(s, e, t) {
		return (e - s) * t + s;
	}
}
});
})(jQuery);