const tetrahedron = "四面体";
const cube = "立方体";
const sphere = "球体";
const icosahedron = "二十面体";
const dodecahedron = "十二面体";
const plane = "平面";
const cone = "圆锥体";
const torus = "六边环";
const teapot = "茶杯";
const bunny = "兔子";
//预定义的几何图形
let predefinedGeometries = [];
//预定义的材质
let predefineMaterials = [];
//定义图形选择下拉框
let geometriesNamesSelected = [
    tetrahedron,
    cube,
    sphere,
    icosahedron,
    dodecahedron,
    plane,
    cone,
    torus,
    teapot,
    bunny
];
let materialNamesSelected = [
    'phongFlat',
    'phongSmooth',
    'lambert',
    'normal',
];
let container, stats
let camera, controls, scene, renderer;
let gui;
let startTime = Date.now();
let info;
let infoDirty = false;
let fopen;
let loadManager;
let objLoader;
let subdivider = null;

// 细分等级最大值
const subdivMax = 8;
const uint32Max = 4294967295;
//几何图形的默认半径
const defaultRadius = 4;




