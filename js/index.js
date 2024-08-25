'use strict';

const bladder_actions_div = document.getElementById('bladder_actions_div');
const bladder_volume_total_div = document.getElementById('bladder_volume_total_div');
const inputs_volume_kind_div = document.getElementById('inputs_volume_kind_div');
const inputs_volume_freq_div = document.getElementById('inputs_volume_freq_div');
const outputs_volume_freq_div = document.getElementById('outputs_volume_freq_div');

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

CanvasJS.addColorSet('light_shades',
[
	'#db9293',
	'#98dad0',
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

	colorSet: 'light_shades',
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
	data: [{}]
};

const CreateSpec = (type, interval_y, label_place, data) =>
{
	const spec_copy = JSON.parse(JSON.stringify(spec_base));

	spec_copy.legend.itemTextFormatter = e => `${e.dataPoint.name}\u2800`;
	spec_copy.data[0].yValueFormatString = '#';

	spec_copy.data[0].indexLabelPlacement = label_place;
	spec_copy.data[0].indexLabelFontFamily = spec_font_family;
	spec_copy.data[0].indexLabelFontSize = spec_font_size;
	spec_copy.data[0].indexLabelFontWeight = spec_font_weight;
	spec_copy.data[0].indexLabelFontColor = spec_foreground_color;

	spec_copy.data[0].indexLabelTextAlign = 'center';
	spec_copy.data[0].indexLabelLineThickness = 2;

	spec_copy.data[0].type = type;
	spec_copy.data[0].dataPoints = data;

	if (type === 'doughnut')
		spec_copy.data[0].innerRadius = interval_y;
	else if (type !== 'pie')
		spec_copy.axisY.interval = interval_y;

	if (type === 'doughnut' || type === 'pie')
		spec_copy.data[0].radius = '100%';

	return spec_copy;
};

const charts = [];

const CreateChart = (id, titles, spec) =>
{
	const element = document.getElementById(id);
	for (const title of titles)
		element.insertAdjacentHTML('beforebegin', `<div class='action-block'>${title}</div>`);
	if (spec.data[0].type !== 'doughnut' && spec.data[0].type !== 'pie')
		element.insertAdjacentHTML('beforebegin', `<div class='br10'></div>`);

	const chart = new CanvasJS.Chart(id, spec);
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

	const inputs_volume_range_dict = defaultDict(() => 0);

	const inputs_time_diff = [];
	const inputs_time_diff_range_dict = defaultDict(() => 0);
	let input_time_prev = null;

	const outputs_volume_range_dict = defaultDict(() => 0);

	const outputs_time_diff = [];
	const outputs_time_diff_range_dict = defaultDict(() => 0);
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

		bladder_actions_div.insertAdjacentHTML('beforeend', `<div class='br20'></div><div class='action-block'>Bladder Actions - Day ${yi}</div>`);
		for (const line_day of lines_day)
		{
			const data_day = line_day.split(' ');
			const io = data_day[0], time = data_day[1], freq = data_day[2], volume = parseInt(data_day[3]), kind = data_day[4];

			let class_block;
			if (io === '+')
			{
				class_block = 'input-block';

				inputs_volume[y].push(volume);
				++inputs_volume_range_dict[Math.trunc(volume / 100)];

				if (input_time_prev !== null)
				{
					const input_time_diff = DiffTimeAsHours(time, input_time_prev);
					inputs_time_diff.push(input_time_diff);
					++inputs_time_diff_range_dict[Math.trunc(input_time_diff)];
				}
				input_time_prev = time;

				++inputs_volume_kind_dicts[y][kind][0];
				inputs_volume_kind_dicts[y][kind][1] += volume;

				++inputs_volume_freq_dicts[y][freq][0];
				inputs_volume_freq_dicts[y][freq][1] += volume;
			}
			else if (io === '-')
			{
				class_block = 'output-block';

				outputs_volume[y].push(volume);
				++outputs_volume_range_dict[Math.trunc(volume / 100)];

				if (output_time_prev !== null)
				{
					const output_time_diff = DiffTimeAsHours(time, output_time_prev);
					outputs_time_diff.push(output_time_diff);
					++outputs_time_diff_range_dict[Math.trunc(output_time_diff)];
				}
				output_time_prev = time;

				++outputs_volume_freq_dicts[y][freq][0];
				outputs_volume_freq_dicts[y][freq][1] += volume;
			}

			let class_transparency;
			if (freq === 'Awake')
				class_transparency = 'normal-transparency';
			else if (freq === 'Sleep')
				class_transparency = 'dark-transparency';

			data_day[1] = `Day=${yi} ${time}`;
			bladder_actions_div.insertAdjacentHTML('beforeend', `<div class='${class_transparency}'><div class='${class_block}'>${data_day.join(' ').replaceAll(' ', '\u2800\u2800\u2800\u2800').padEnd(47, ' ')}</div></div>`);
		}

		const inputs_volume_total = inputs_volume[y].reduce((a, b) => a + b, 0);
		const outputs_volume_total = outputs_volume[y].reduce((a, b) => a + b, 0);

		const bladder_volume_total_data =
		[
			{label: `Inputs Volume Total: ${inputs_volume[y].length}pcs`, indexLabel: `${inputs_volume_total}ml`, y: inputs_volume_total, color: '#c0d0f0'},
			{label: `Outputs Volume Total: ${outputs_volume[y].length}pcs`, indexLabel: `${outputs_volume_total}ml`, y: outputs_volume_total, color: '#ffffaa'}
		];
		const bladder_volume_total_spec = CreateSpec('column', 500, 'inside', bladder_volume_total_data);

		bladder_volume_total_div.insertAdjacentHTML('beforeend', `<div id='bladder_volume_total_div_${yi}' class='chart_div'></div>`);
		CreateChart(`bladder_volume_total_div_${yi}`, [`Bladder Volume Total (ml) - ${yi}. Day`], bladder_volume_total_spec);
		bladder_volume_total_div.insertAdjacentHTML('beforeend', `<div class='br20'></div>`);

		const inputs_volume_kind_data = [];
		for (const [key, value] of Object.entries(inputs_volume_kind_dicts[y]).sort(([, valueA], [, valueB]) => valueB[1] - valueA[1]))
			inputs_volume_kind_data.push({name: key, y: value[1], pcs: value[0]});
		const inputs_volume_kind_spec = CreateSpec('doughnut', 80, 'outside', inputs_volume_kind_data);

		inputs_volume_kind_spec.data[0].indexLabel = '\u2800{name} - {y}ml - {pcs}pcs - #percent%\u2800';
		inputs_volume_kind_spec.data[0].showInLegend = true;

		inputs_volume_kind_div.insertAdjacentHTML('beforeend', `<div id='inputs_volume_kind_div_${yi}' class='chart_div'></div>`);
		CreateChart(`inputs_volume_kind_div_${yi}`, [`Inputs Kind (ml) - ${yi}. Day`, `Total: ${inputs_volume_total}ml`], inputs_volume_kind_spec);
		inputs_volume_kind_div.insertAdjacentHTML('beforeend', `<div class='br20'></div>`);

		const inputs_volume_freq_data = [];
		for (const [key, value] of Object.entries(inputs_volume_freq_dicts[y]).sort(([, valueA], [, valueB]) => valueB[1] - valueA[1]))
			inputs_volume_freq_data.push({name: key, y: value[1], pcs: value[0]});
		const inputs_volume_freq_spec = CreateSpec('pie', null, 'outside', inputs_volume_freq_data);

		inputs_volume_freq_spec.data[0].indexLabel = '\u2800{name} - {y}ml - {pcs}pcs - #percent%\u2800';
		inputs_volume_freq_spec.data[0].showInLegend = true;

		inputs_volume_freq_div.insertAdjacentHTML('beforeend', `<div id='inputs_volume_freq_div_${yi}' class='chart_div'></div>`);
		CreateChart(`inputs_volume_freq_div_${yi}`, [`Inputs Diurnal | Nocturnal Freq (ml) - ${yi}. Day`, `Total: ${inputs_volume_total}ml`], inputs_volume_freq_spec);
		inputs_volume_freq_div.insertAdjacentHTML('beforeend', `<div class='br20'></div>`);

		const outputs_volume_freq_data = [];
		for (const [key, value] of Object.entries(outputs_volume_freq_dicts[y]).sort(([, valueA], [, valueB]) => valueB[1] - valueA[1]))
			outputs_volume_freq_data.push({name: key, y: value[1], pcs: value[0]});
		const outputs_volume_freq_spec = CreateSpec('pie', null, 'outside', outputs_volume_freq_data);

		outputs_volume_freq_spec.data[0].indexLabel = '\u2800{name} - {y}ml - {pcs}pcs - #percent%\u2800';
		outputs_volume_freq_spec.data[0].showInLegend = true;

		outputs_volume_freq_div.insertAdjacentHTML('beforeend', `<div id='outputs_volume_freq_div_${yi}' class='chart_div'></div>`);
		CreateChart(`outputs_volume_freq_div_${yi}`, [`Outputs Diurnal | Nocturnal Freq (ml) - ${yi}. Day`, `Total: ${outputs_volume_total}ml`], outputs_volume_freq_spec);
		outputs_volume_freq_div.insertAdjacentHTML('beforeend', `<div class='br20'></div>`);
	}

	const [inputs_volume_min, inputs_volume_max, inputs_volume_avg, inputs_volume_med] = CalculateMinMaxAvgMed(inputs_volume.flat(1));
	const inputs_volume_range_data = [];
	for (let i = 0; i < Object.keys(inputs_volume_range_dict).length; ++i)
		inputs_volume_range_data.push({ label: `${String(i * 100).padStart(3, '0')} - ${String((i + 1) * 100 - 1).padStart(3, '0')} ml`, indexLabel: `${inputs_volume_range_dict[i]}pcs`, y: inputs_volume_range_dict[i] });
	const inputs_volume_range_spec = CreateSpec('column', 5, 'inside', inputs_volume_range_data);
	CreateChart('inputs_volume_range_div', ['Inputs Volume Range (ml) - All Days', `Min: ${inputs_volume_min}ml,\u2800Max: ${inputs_volume_max}ml,\u2800Avg: ${inputs_volume_avg.toFixed(2)}ml,\u2800Med: ${inputs_volume_med.toFixed(2)}ml`], inputs_volume_range_spec);

	const [inputs_time_diff_min, inputs_time_diff_max, inputs_time_diff_avg, inputs_time_diff_med] = CalculateMinMaxAvgMed(inputs_time_diff);
	const inputs_time_diff_range_data = [];
	for (let i = 0; i < Object.keys(inputs_time_diff_range_dict).length; ++i)
		inputs_time_diff_range_data.push({ label: `${i.toFixed(2)} - ${i + 1 - 0.01} hr`, indexLabel: `${inputs_time_diff_range_dict[i]}pcs`, y: inputs_time_diff_range_dict[i] });
	const inputs_time_diff_range_spec = CreateSpec('column', 5, 'inside', inputs_time_diff_range_data);
	CreateChart('inputs_time_diff_range_div', ['Inputs Time Diff Range (hr) - All Days', `Min: ${inputs_time_diff_min.toFixed(2)}hr,\u2800Max: ${inputs_time_diff_max.toFixed(2)}hr,\u2800Avg: ${inputs_time_diff_avg.toFixed(2)}hr,\u2800Med: ${inputs_time_diff_med.toFixed(2)}hr`], inputs_time_diff_range_spec);

	const [outputs_volume_min, outputs_volume_max, outputs_volume_avg, outputs_volume_med] = CalculateMinMaxAvgMed(outputs_volume.flat(1));
	const outputs_volume_range_data = [];
	for (let i = 0; i < Object.keys(outputs_volume_range_dict).length; ++i)
		outputs_volume_range_data.push({ label: `${String(i * 100).padStart(3, '0')} - ${String((i + 1) * 100 - 1).padStart(3, '0')} ml`, indexLabel: `${outputs_volume_range_dict[i]}pcs`, y: outputs_volume_range_dict[i] });
	const outputs_volume_range_spec = CreateSpec('column', 5, 'inside', outputs_volume_range_data);
	CreateChart('outputs_volume_range_div', ['Outputs Volume Range (ml) - All Days', `Min: ${outputs_volume_min}ml,\u2800Max: ${outputs_volume_max}ml,\u2800Avg: ${outputs_volume_avg.toFixed(2)}ml,\u2800Med: ${outputs_volume_med.toFixed(2)}ml`], outputs_volume_range_spec);

	const [outputs_time_diff_min, outputs_time_diff_max, outputs_time_diff_avg, outputs_time_diff_med] = CalculateMinMaxAvgMed(outputs_time_diff);
	const outputs_time_diff_range_data = [];
	for (let i = 0; i < Object.keys(outputs_time_diff_range_dict).length; ++i)
		outputs_time_diff_range_data.push({ label: `${i.toFixed(2)} - ${i + 1 - 0.01} hr`, indexLabel: `${outputs_time_diff_range_dict[i]}pcs`, y: outputs_time_diff_range_dict[i] });
	const outputs_time_diff_range_spec = CreateSpec('column', 5, 'inside', outputs_time_diff_range_data);
	CreateChart('outputs_time_diff_range_div', ['Outputs Time Diff Range (hr) - All Days', `Min: ${outputs_time_diff_min.toFixed(2)}hr,\u2800Max: ${outputs_time_diff_max.toFixed(2)}hr,\u2800Avg: ${outputs_time_diff_avg.toFixed(2)}hr,\u2800Med: ${outputs_time_diff_med.toFixed(2)}hr`], outputs_time_diff_range_spec);
};