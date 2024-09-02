'use strict';

const bladder_actions_div = document.getElementById('bladder_actions_div');

const multiArray = length =>
{
	const result = [];
	for (let i = 0; i < length; ++i)
		result.push([]);
	return result;
};

const defaultDict = factory => new Proxy({},
{
	get: (target, name) =>
	{
		if (!(name in target))
			target[name] = factory();
		return target[name];
	}
});

const CalculateMedian = values =>
{
	if (values.length === 0)
		return 0;

	const values_sorted = [...values].sort((a, b) => a - b);
	const index_middle = Math.floor(values_sorted.length / 2);
	return values_sorted.length % 2 === 1 ? values_sorted[index_middle] : (values_sorted[index_middle - 1] + values_sorted[index_middle]) / 2;
};

const CalculateMinMaxAvgMed = values =>
{
	let min = Number.MAX_VALUE, max = Number.MIN_VALUE , avg = 0;
	const med = CalculateMedian(values);
	for (const value of values)
	{
		min = Math.min(min, value);
		max = Math.max(max, value);
		avg += value;
	}
	avg /= values.length;
	return [min, max, avg, med];
};

const ParseTimeToHours = time =>
{
	const [hours, minutes] = time.split(':').map(Number);
	return hours + minutes / 60;
};

const DiffTimeAsHours = (time1, time2) =>
{
	let result = ParseTimeToHours(time1) - ParseTimeToHours(time2);
	if (result < 0)
		result += 24;
	return result;
};

const spec_color_set = 'light_shades';

CanvasJS.addColorSet(spec_color_set,
[
	'#db9293',
	'#98dad8',
	'#e0c5ad',
	'#e4e4ad',
	'#d1a1c7',
	'#d0d0d0',
	'#a9e0c6',
	'#a3d7a7'
]);

const spec_font_family = 'Roboto';
const spec_font_size = 20;
const spec_font_weight = 'normal';
const spec_background_color = '#f0f0f0';
const spec_foreground_color = '#202020';

const spec_base =
{
	interactivityEnabled: false,

	colorSet: spec_color_set,
	backgroundColor: spec_background_color,

	legend:
	{
		fontFamily: spec_font_family,
		fontSize: spec_font_size,
		fontWeight: spec_font_weight,
		fontColor: spec_foreground_color
	},
	axisX:
	{
		labelFontFamily: spec_font_family,
		labelFontSize: spec_font_size,
		labelFontWeight: spec_font_weight,
		labelFontColor: spec_foreground_color,

		lineColor: spec_foreground_color,
		gridColor: spec_foreground_color,

		valueFormatString: '#'
	},
	axisY:
	{
		minimum: 0,

		labelFontFamily: spec_font_family,
		labelFontSize: spec_font_size,
		labelFontWeight: spec_font_weight,
		labelFontColor: spec_foreground_color,

		lineColor: spec_foreground_color,
		gridColor: spec_foreground_color,

		valueFormatString: '#'
	},
	data: []
};

const CreateSpec = (type, interval_y, label_place, rows) =>
{
	const spec_copy = JSON.parse(JSON.stringify(spec_base));

	for (let i = 0; i < rows.length; ++i)
	{
		spec_copy.data.push({});

		spec_copy.data[i].yValueFormatString = '#';

		spec_copy.data[i].indexLabelPlacement = label_place;
		spec_copy.data[i].indexLabelFontFamily = spec_font_family;
		spec_copy.data[i].indexLabelFontSize = spec_font_size;
		spec_copy.data[i].indexLabelFontWeight = spec_font_weight;
		spec_copy.data[i].indexLabelFontColor = spec_foreground_color;

		spec_copy.data[i].indexLabelTextAlign = 'center';
		spec_copy.data[i].indexLabelLineThickness = 2;

		spec_copy.data[i].type = type;
		spec_copy.data[i].dataPoints = rows[i];

		if (type === 'stackedColumn')
			spec_copy.data[i].showInLegend = true;
		if (type === 'doughnut' || type === 'pie')
		{
			spec_copy.data[i].radius = '100%';
			if (type === 'doughnut')
				spec_copy.data[i].innerRadius = interval_y;

			spec_copy.data[i].showInLegend = true;
			spec_copy.data[i].indexLabel = '\u2800{name} - {y}ml - {pcs}pcs - #percent%\u2800';
		}
	}

	if (type !== 'stackedColumn')
		spec_copy.legend.itemTextFormatter = e => `${e.dataPoint.name}\u2800`;
	if (type !== 'doughnut' && type !== 'pie')
		spec_copy.axisY.interval = interval_y;

	return spec_copy;
};

const charts = [];

const CreateChart = (id, titles, height, spec) =>
{
	const element = document.getElementById(id);
	element.insertAdjacentHTML('beforeend', `<div class='br20'></div>`);
	for (const title of titles)
		element.insertAdjacentHTML('beforeend', `<div class='action-div'>${title}</div>`);
	if (spec.data[0].type !== 'doughnut' && spec.data[0].type !== 'pie')
		element.insertAdjacentHTML('beforeend', `<div class='br10'></div>`);

	const chart_container_id = `${id}_${charts.length + 1}`;
	element.insertAdjacentHTML('beforeend', `<div id='${chart_container_id}' class='chart-div' style='height: ${height}px'></div>`);

	const chart = new CanvasJS.Chart(chart_container_id, spec);
	charts.push(chart);
	chart.render();
};

const PrepareToPrint = isExternal =>
{
	const style_print = document.createElement('link');
	style_print.rel = 'stylesheet';
	style_print.href = 'css/index_print.css';

	style_print.onload = () =>
	{
		const style_print_page = document.createElement('style');
		style_print_page.innerHTML = `@page {size: 21cm ${document.documentElement.offsetHeight}px}`;
		document.head.appendChild(style_print_page);

		for (const chart of charts)
			chart.render();

		if (isExternal)
			setTimeout(() => print(), 3000);
	};

	document.head.appendChild(style_print);
};

window.matchMedia('print').onchange = () => PrepareToPrint(false);
document.getElementById('print_button').onclick = () => PrepareToPrint(true);

document.getElementById('file_open_input').onchange = event_input =>
{
	const file = event_input.target.files[0];
	if (!file)
		return;

	const file_reader = new FileReader();
	file_reader.onload = event_file => AnalyzeBladderDiaryText(event_file.target.result);
	file_reader.readAsText(file);
};

const Freqs = Object.freeze(
{
	AWAKE: 'Awake',
	SLEEP: 'Sleep'
});

const AnalyzeBladderDiaryText = text =>
{
	const lines_all = text.split('\n----------------\n');

	const lines_last = lines_all.at(-1).split('\n');
	const lines_lw = lines_last[1].split('$');
	lines_last.push(`Recorded Days: ${lines_all.length - 1}`);

	const credential_length = parseInt(lines_lw[0].split(': ')[1]) / 100;
	const credential_weight = parseInt(lines_lw[1].split(': ')[1]);
	const credential_bmi = credential_weight / (credential_length * credential_length);
	lines_last[1] += `, BMI: ${credential_bmi.toFixed(2)}kg/m2`;

	document.getElementById('credentials_div').insertAdjacentHTML('beforeend', `${lines_last.join(`<div class='br10'></div>`).replaceAll('$', ', ')}`);

	const inputs_volume = [];
	const outputs_volume = [];

	const inputs_volume_kind_dicts = [];

	const inputs_volume_freq_dicts = [];
	const outputs_volume_freq_dicts = [];

	const inputs_volume_range_dict =
	{
		[Freqs.AWAKE]: defaultDict(() => 0),
		[Freqs.SLEEP]: defaultDict(() => 0)
	};

	const inputs_time_diff = [];
	const inputs_time_diff_range_dict =
	{
		[Freqs.AWAKE]: defaultDict(() => 0),
		[Freqs.SLEEP]: defaultDict(() => 0)
	};
	let input_time_prev = null;

	const outputs_volume_range_dict =
	{
		[Freqs.AWAKE]: defaultDict(() => 0),
		[Freqs.SLEEP]: defaultDict(() => 0)
	};

	const outputs_time_diff = [];
	const outputs_time_diff_range_dict =
	{
		[Freqs.AWAKE]: defaultDict(() => 0),
		[Freqs.SLEEP]: defaultDict(() => 0)
	};
	let output_time_prev = null;

	for (let y = 0; y < lines_all.length - 1; ++y)
	{
		const yi = y + 1;

		const lines_day = lines_all[y].split('\n');

		inputs_volume.push([]);
		outputs_volume.push([]);

		inputs_volume_kind_dicts.push(defaultDict(() => [0, 0]));

		inputs_volume_freq_dicts.push(defaultDict(() => [0, 0]));
		outputs_volume_freq_dicts.push(defaultDict(() => [0, 0]));

		bladder_actions_div.insertAdjacentHTML('beforeend', `<div class='br20'></div><div class='action-div'>Bladder Actions - Day ${yi}</div>`);
		for (const line_day of lines_day)
		{
			const data_day = line_day.split(' ');
			const io = data_day[0], time = data_day[1], freq = data_day[2], volume = parseInt(data_day[3]), kind = data_day[4];

			let class_block;
			if (io === '+')
			{
				class_block = 'input-div';

				inputs_volume[y].push(volume);
				++inputs_volume_range_dict[freq][Math.trunc(volume / 100)];

				if (input_time_prev !== null)
				{
					const input_time_diff = DiffTimeAsHours(time, input_time_prev);
					inputs_time_diff.push(input_time_diff);
					++inputs_time_diff_range_dict[freq][Math.trunc(input_time_diff)];
				}
				input_time_prev = time;

				++inputs_volume_kind_dicts[y][kind][0];
				inputs_volume_kind_dicts[y][kind][1] += volume;

				++inputs_volume_freq_dicts[y][freq][0];
				inputs_volume_freq_dicts[y][freq][1] += volume;
			}
			else if (io === '-')
			{
				class_block = 'output-div';

				outputs_volume[y].push(volume);
				++outputs_volume_range_dict[freq][Math.trunc(volume / 100)];

				if (output_time_prev !== null)
				{
					const output_time_diff = DiffTimeAsHours(time, output_time_prev);
					outputs_time_diff.push(output_time_diff);
					++outputs_time_diff_range_dict[freq][Math.trunc(output_time_diff)];
				}
				output_time_prev = time;

				++outputs_volume_freq_dicts[y][freq][0];
				outputs_volume_freq_dicts[y][freq][1] += volume;
			}

			let class_transparency;
			if (freq === Freqs.AWAKE)
				class_transparency = 'normal-transparency';
			else if (freq === Freqs.SLEEP)
				class_transparency = 'dark-transparency';

			data_day[1] = `Day=${yi} ${time}`;
			bladder_actions_div.insertAdjacentHTML('beforeend', `<div class='${class_transparency}'><div class='${class_block}'>${data_day.join(' ').replaceAll(' ', '\u2800\u2800\u2800\u2800').padEnd(47, ' ')}</div></div>`);
		}

		const inputs_volume_total = inputs_volume[y].reduce((a, b) => a + b, 0);
		const outputs_volume_total = outputs_volume[y].reduce((a, b) => a + b, 0);

		const bladder_volume_total_data =
		[[
			{
				label: `Inputs Volume Total: ${inputs_volume[y].length}pcs`,
				y: inputs_volume_total,
				indexLabel: `${inputs_volume_total}ml`,
				color: '#c0d0f0'
			},
			{
				label: `Outputs Volume Total: ${outputs_volume[y].length}pcs`,
				y: outputs_volume_total,
				indexLabel: `${outputs_volume_total}ml`,
				color: '#ffffaa'
			}
		]];
		const bladder_volume_total_spec = CreateSpec('column', 500, 'inside', bladder_volume_total_data);
		CreateChart('bladder_volume_total_div', [`Bladder Volume Total (ml) - ${yi}. Day`], 420, bladder_volume_total_spec);

		const inputs_volume_kind_data = [[]];
		for (const [key, value] of Object.entries(inputs_volume_kind_dicts[y]).sort(([, valueA], [, valueB]) => valueB[1] - valueA[1]))
		{
			inputs_volume_kind_data[0].push(
			{
				name: key,
				y: value[1],
				pcs: value[0]
			});
		}
		const inputs_volume_kind_spec = CreateSpec('doughnut', 80, 'outside', inputs_volume_kind_data);
		CreateChart('inputs_volume_kind_div', [`Inputs Kind (ml) - ${yi}. Day`, `Total: ${inputs_volume_total}ml`], 420, inputs_volume_kind_spec);

		const inputs_volume_freq_data = [[]];
		for (const [key, value] of Object.entries(inputs_volume_freq_dicts[y]).sort(([keyA,], [keyB,]) => keyB.localeCompare(keyA)))
		{
			inputs_volume_freq_data[0].push(
			{
				name: key,
				y: value[1],
				pcs: value[0]
			});
		}
		const inputs_volume_freq_spec = CreateSpec('pie', null, 'outside', inputs_volume_freq_data);
		CreateChart('inputs_volume_freq_div', [`Inputs Diurnal | Nocturnal Freq (ml) - ${yi}. Day`, `Total: ${inputs_volume_total}ml`], 420, inputs_volume_freq_spec);

		const outputs_volume_freq_data = [[]];
		for (const [key, value] of Object.entries(outputs_volume_freq_dicts[y]).sort(([keyA,], [keyB,]) => keyB.localeCompare(keyA)))
		{
			outputs_volume_freq_data[0].push(
			{
				name: key,
				y: value[1],
				pcs: value[0]
			});
		}
		const outputs_volume_freq_spec = CreateSpec('pie', null, 'outside', outputs_volume_freq_data);
		CreateChart('outputs_volume_freq_div', [`Outputs Diurnal | Nocturnal Freq (ml) - ${yi}. Day`, `Total: ${outputs_volume_total}ml`], 420, outputs_volume_freq_spec);
	}
	
	const freqs_length = Object.keys(Freqs).length;
	const freqs_values = Object.values(Freqs);

	const [inputs_volume_min, inputs_volume_max, inputs_volume_avg, inputs_volume_med] = CalculateMinMaxAvgMed(inputs_volume.flat(1));
	const inputs_volume_range_data = multiArray(freqs_length);
	freqs_values.forEach((freq, i) =>
	{
		for (let j = 0; j < Object.keys(inputs_volume_range_dict[freq]).length; ++j)
		{
			inputs_volume_range_data[i].push(
			{
				name: freq,
				label: `${String(j * 100).padStart(3, '0')} - ${String((j + 1) * 100 - 1).padStart(3, '0')} ml`,
				y: inputs_volume_range_dict[freq][j]/*,
				indexLabel: `${inputs_volume_range_dict[freq][j]}pcs`*/
			});
		}
	});
	const inputs_volume_range_spec = CreateSpec('stackedColumn', 2, 'inside', inputs_volume_range_data);
	CreateChart('inputs_volume_range_div',
	[
		'Inputs Volume Range (ml) - All Days',
		`Min: ${inputs_volume_min}ml,\u2800Max: ${inputs_volume_max}ml,\u2800Avg: ${inputs_volume_avg.toFixed(2)}ml,\u2800Med: ${inputs_volume_med.toFixed(2)}ml`
	],
	540, inputs_volume_range_spec);

	const [inputs_time_diff_min, inputs_time_diff_max, inputs_time_diff_avg, inputs_time_diff_med] = CalculateMinMaxAvgMed(inputs_time_diff);
	const inputs_time_diff_range_data = multiArray(freqs_length);
	freqs_values.forEach((freq, i) =>
	{
		for (let j = 0; j < Object.keys(inputs_time_diff_range_dict[freq]).length; ++j)
		{
			inputs_time_diff_range_data[i].push(
			{
				name: freq,
				label: `${j.toFixed(2)} - ${j + 1 - 0.01} hr`,
				y: inputs_time_diff_range_dict[freq][j]/*,
				indexLabel: `${inputs_time_diff_range_dict[freq][j]}pcs`*/
			});
		}
	});
	const inputs_time_diff_range_spec = CreateSpec('stackedColumn', 2, 'inside', inputs_time_diff_range_data);
	CreateChart('inputs_time_diff_range_div',
	[
		'Inputs Time Diff Range (hr) - All Days',
		`Min: ${inputs_time_diff_min.toFixed(2)}hr,\u2800Max: ${inputs_time_diff_max.toFixed(2)}hr,\u2800Avg: ${inputs_time_diff_avg.toFixed(2)}hr,\u2800Med: ${inputs_time_diff_med.toFixed(2)}hr`
	], 540, inputs_time_diff_range_spec);

	const [outputs_volume_min, outputs_volume_max, outputs_volume_avg, outputs_volume_med] = CalculateMinMaxAvgMed(outputs_volume.flat(1));
	const outputs_volume_range_data = multiArray(freqs_length);
	freqs_values.forEach((freq, i) =>
	{
		for (let j = 0; j < Object.keys(outputs_volume_range_dict[freq]).length; ++j)
		{
			outputs_volume_range_data[i].push(
			{
				name: freq,
				label: `${String(j * 100).padStart(3, '0')} - ${String((j + 1) * 100 - 1).padStart(3, '0')} ml`,
				y: outputs_volume_range_dict[freq][j]/*,
				indexLabel: `${outputs_volume_range_dict[freq][j]}pcs`*/
			});
		}
	});
	const outputs_volume_range_spec = CreateSpec('stackedColumn', 2, 'inside', outputs_volume_range_data);
	CreateChart('outputs_volume_range_div',
	[
		'Outputs Volume Range (ml) - All Days',
		`Min: ${outputs_volume_min}ml,\u2800Max: ${outputs_volume_max}ml,\u2800Avg: ${outputs_volume_avg.toFixed(2)}ml,\u2800Med: ${outputs_volume_med.toFixed(2)}ml`
	],
	540, outputs_volume_range_spec);

	const [outputs_time_diff_min, outputs_time_diff_max, outputs_time_diff_avg, outputs_time_diff_med] = CalculateMinMaxAvgMed(outputs_time_diff);
	const outputs_time_diff_range_data = multiArray(freqs_length);
	freqs_values.forEach((freq, i) =>
	{
		for (let j = 0; j < Object.keys(outputs_time_diff_range_dict[freq]).length; ++j)
		{
			outputs_time_diff_range_data[i].push(
			{
				name: freq,
				label: `${j.toFixed(2)} - ${j + 1 - 0.01} hr`,
				y: outputs_time_diff_range_dict[freq][j]/*,
				indexLabel: `${outputs_time_diff_range_dict[freq][j]}pcs`*/
			});
		}
	});
	const outputs_time_diff_range_spec = CreateSpec('stackedColumn', 2, 'inside', outputs_time_diff_range_data);
	CreateChart('outputs_time_diff_range_div',
	[
		'Outputs Time Diff Range (hr) - All Days',
		`Min: ${outputs_time_diff_min.toFixed(2)}hr,\u2800Max: ${outputs_time_diff_max.toFixed(2)}hr,\u2800Avg: ${outputs_time_diff_avg.toFixed(2)}hr,\u2800Med: ${outputs_time_diff_med.toFixed(2)}hr`
	], 540, outputs_time_diff_range_spec);
};