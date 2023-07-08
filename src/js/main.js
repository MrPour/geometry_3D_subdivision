'use-strict';

import DefaultConst from './const.js';
import {Subdivision} from './loop.js'

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

let subdivider,objLoader,loadManager,fopen,info,gui,stats,container,camera, controls, scene, renderer = null;

//页面加载完成后调用init方法
window.addEventListener('load', init);

// monkey-patch 图形界面插件
dat.GUI.prototype.removeFolder = function (fldl) {
	let name = fldl.name;
	let folder = this.__folders[name];
	if (!folder) {
		return;
	}
	folder.close();
	this.__ul.removeChild(folder.domElement.parentNode);
	delete this.__folders[name];
	this.onResize();
}


//界面选择的初始化参数
let panelShowParams = {
	geometry: DefaultConst.tetrahedron,
	subdivAmount: 0,
	material: 'phongFlat',
	meshColor: '#ff9500',
	surface: true,
	wireColor: '#ffffff',
	wireframe: true,
	originalColor: '#e5e6df',
	original: true,
	backgroundColor: '#a3c096',
	autoRotate: false,
};

let paramControllers = {
	subdivAmount: null,
}

//当前面板中选中的参数
let currentParams = {
	currentGeometryName: panelShowParams.geometry,
	subdivAmount: -1,
	originalGeometry: null,
	currentGeometry: null,
	mesh: null,
	wireMesh: null,
	origMesh: null,
	wireMat: null,
	origMat: null,
	meshColor: new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x'))),
	wireColor: new THREE.Color(parseInt(panelShowParams.wireColor.replace('#', '0x'))),
	originalColor: new THREE.Color(parseInt(panelShowParams.originalColor.replace('#', '0x'))),
	backgroundColor: new THREE.Color(parseInt(panelShowParams.backgroundColor.replace('#', '0x'))),
	material: panelShowParams.material,
};

//细分操作 需要传入num - 用户选择细分等级
function makeSubdivition(num)
{
	//如果当前没有细分器，就创建一个
	if (!subdivider)
	{
		subdivider = new Subdivision(currentParams.originalGeometry);
	}
	//如果当前传入的细分等级num与目前渲染的细分等级subdivAmount相等，则不需要执行细分操作，否则执行
	if (num != currentParams.subdivAmount) {
		//为当前参数列表赋值
		currentParams.subdivAmount = num;
		//调用细分方法进行细分，得到细分后的模型
		//将模型赋到当前参数列表中
		currentParams.currentGeometry = subdivider.subdivide(num);
		currentParams.mesh.geometry = currentParams.currentGeometry;
		currentParams.wireMesh.geometry = currentParams.currentGeometry;
		//设置是否显示原始模型
		currentParams.origMesh.visible = panelShowParams.original && num > 0;
		//更新信息
		updateInfo();
	}
}



function changeMeshFromGeometry(geometry) {
	if (subdivider) {
		subdivider.dispose();
		subdivider = null;
		currentParams.subdivAmount = -1;
		panelShowParams.subdivAmount = 0;
		paramControllers.subdivAmount.updateDisplay();
	}
	currentParams.originalGeometry = geometry;
	currentParams.origMesh.geometry = currentParams.originalGeometry;
	currentParams.origMesh.visible = false;
	// 创建一个新的细分器
	subdivider = new Subdivision(currentParams.originalGeometry);
	currentParams.currentGeometry = subdivider.subdivide(0);
	currentParams.subdivAmount = 0;
	currentParams.mesh.geometry = currentParams.currentGeometry;
	currentParams.wireMesh.geometry = currentParams.currentGeometry;
	updateInfo();
}

function changeMeshGeometry() {
	if (currentParams.currentGeometryName == 'OBJ file...') {
		debugger
		currentParams.originalGeometry.dispose();
		currentParams.currentGeometryName = '';
	}
	if (panelShowParams.geometry == 'OBJ file...') {
		fopen.click();
	} else {
		changeMeshFromGeometry(DefaultConst.predefinedGeometries[panelShowParams.geometry]);
		currentParams.currentGeometryName = panelShowParams.geometry;
	}
}

// 将图形初始化到屏幕中央
function normalizeGeometry(geom) {
	// 计算边界范围- 得到半径和物体中心
	geom.computeBoundingSphere();
	//用球半径求比例尺因子
	const scaleFactor = DefaultConst.defaultRadius / geom.boundingSphere.radius;
	// 用比例尺因子缩放所有的顶点
	for (let i = 0, il = geom.vertices.length; i < il; ++i) {
		geom.vertices[i].multiplyScalar(scaleFactor);
	}
	// 重新计算边界范围
	geom.computeBoundingSphere();
	// 使用它的中心作为偏移的几何中心
	let offset = geom.boundingSphere.center;
	offset.negate();
	for (let i = 0, il = geom.vertices.length; i < il; ++i) {
		geom.vertices[i].add(offset);
	}
	// 再次计算
	geom.computeBoundingSphere();
}



//材质的切换
function changeMeshMaterial() {
	currentParams.mesh.material = DefaultConst.predefineMaterials[panelShowParams.material];
	currentParams.material = panelShowParams.material;
	currentParams.mesh.material.needsUpdate = true;
}

//网格颜色的切换
function changeMeshColor() {
	currentParams.meshColor = new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x')));
	DefaultConst.predefineMaterials['phongFlat'].color = currentParams.meshColor;
	DefaultConst.predefineMaterials['phongSmooth'].color = currentParams.meshColor;
	DefaultConst.predefineMaterials['lambert'].color = currentParams.meshColor;
	currentParams.mesh.material.needsUpdate = true;
}

//网格线颜色的切换
function changeWireMeshColor() {
	info.style.color = panelShowParams.wireColor;
	currentParams.wireColor = new THREE.Color(parseInt(panelShowParams.wireColor.replace('#', '0x')));
	currentParams.wireMat.color = currentParams.wireColor;
	currentParams.wireMat.needsUpdate = true;
}

//修改初始颜色
function changeOriginalColor() {
	currentParams.originalColor = new THREE.Color(parseInt(panelShowParams.originalColor.replace('#', '0x')));
	currentParams.origMat.color = currentParams.originalColor;
	currentParams.origMat.needsUpdate = true;
}

//修改背景颜色
function changeBackgroundColor() {
	currentParams.backgroundColor = new THREE.Color(parseInt(panelShowParams.backgroundColor.replace('#', '0x')));
	renderer.setClearColor(currentParams.backgroundColor);
}

//切换是否显示网格曲面
function changeMeshSurface() {
	currentParams.mesh.visible = panelShowParams.surface;
}

//切换是否显示网格线
function changeMeshWireframe() {
	currentParams.wireMesh.visible = panelShowParams.wireframe;
}

//原模型是否可见
function changeMeshOriginal() {
	currentParams.origMesh.visible = panelShowParams.original && currentParams.subdivAmount > 0;
}

//默认几何形体加入场景
function createDefaultGeometry() {
	//读取初始的几何模型
	currentParams.originalGeometry = DefaultConst.predefinedGeometries[panelShowParams.geometry];
	//细分器初始化，细分等级默认0初值
	subdivider = new Subdivision(currentParams.originalGeometry);
	//几何形体设定
	currentParams.currentGeometry = subdivider.subdivide(0);
	//细分等级设定
	currentParams.subdivAmount = 0;
	//使用three.js根据几何形体设置初始的网格
	currentParams.mesh = new THREE.Mesh(
		currentParams.currentGeometry
	);
	//加载默认材质
	changeMeshMaterial();

	//将形初始几何模型加入到THREE.Scene的场景里
	scene.add(currentParams.mesh);

	//three.js生成网格线并加入
	//几何体是不能被渲染的，只有几何体和材质结合成网格才能被渲染到屏幕上
	currentParams.wireMesh = new THREE.Mesh(
		currentParams.currentGeometry,
		currentParams.wireMat
	);
	scene.add(currentParams.wireMesh);

    //three.js生成原始网格线并加入
	currentParams.origMesh = new THREE.Mesh(
		currentParams.originalGeometry,
		currentParams.origMat
	);
	//设置是否可见
	currentParams.origMesh.visible = false;
	scene.add(currentParams.origMesh);
}

//three.js提供的各类模型，对模型进行初始化
function createPredefinedGeometries() {
	DefaultConst.predefinedGeometries[DefaultConst.tetrahedron] = new THREE.TetrahedronGeometry(DefaultConst.defaultRadius);
	DefaultConst.predefinedGeometries[DefaultConst.cube] = new THREE.BoxGeometry(DefaultConst.defaultRadius, DefaultConst.defaultRadius, DefaultConst.defaultRadius);
	DefaultConst.predefinedGeometries[DefaultConst.sphere] = new THREE.SphereGeometry(DefaultConst.defaultRadius, 16, 9);
	DefaultConst.predefinedGeometries[DefaultConst.icosahedron] = new THREE.IcosahedronGeometry(DefaultConst.defaultRadius);
	DefaultConst.predefinedGeometries[DefaultConst.dodecahedron] = new THREE.DodecahedronGeometry(DefaultConst.defaultRadius);
	DefaultConst.predefinedGeometries[DefaultConst.plane] = new THREE.PlaneGeometry(DefaultConst.defaultRadius * 2, 2, 2, 2);
	DefaultConst.predefinedGeometries[DefaultConst.cone] = new THREE.ConeGeometry(DefaultConst.defaultRadius, 8, 8);
	DefaultConst.predefinedGeometries[DefaultConst.torus] = new THREE.TorusGeometry(DefaultConst.defaultRadius, 1);
	DefaultConst.predefinedGeometries[DefaultConst.sphere].mergeVertices();
	DefaultConst.predefinedGeometries[DefaultConst.torus].mergeVertices();
	// // 加载单独的obj文件
	loadAsset(DefaultConst.teapot, 'assets/teapot.obj');
	loadAsset(DefaultConst.bunny, 'assets/bunny.obj');
}

//创建各种材质
function createPredefinedMaterials() {
	let commonPhongParams = {
		color: currentParams.meshColor,
		shininess: 40,
		specular: 0x222222
	};
	DefaultConst.predefineMaterials['phongFlat'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongFlat'].shading = THREE.FlatShading;
	DefaultConst.predefineMaterials['phongSmooth'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongSmooth'].shading = THREE.SmoothShading;
	DefaultConst.predefineMaterials['lambert'] = new THREE.MeshLambertMaterial({color: currentParams.meshColor});
	DefaultConst.predefineMaterials['normal'] = new THREE.MeshNormalMaterial();
	// 创建线框材质
	currentParams.wireMat = new THREE.MeshBasicMaterial({
		color: currentParams.wireColor,
		wireframe: true
	});
	currentParams.origMat = new THREE.MeshBasicMaterial({
		color: currentParams.originalColor,
		wireframe: true
	});
}
//自动旋转开闭
function changeAutoRotation() {
	if (!panelShowParams.autoRotate) {
		currentParams.mesh.rotation.x = 0;
		currentParams.mesh.rotation.y = 0;
		currentParams.wireMesh.rotation.x = 0;
		currentParams.wireMesh.rotation.y = 0;
		currentParams.origMesh.rotation.x = 0;
		currentParams.origMesh.rotation.y = 0;
		DefaultConst.startTime = Date.now();
	}
}


//界面初始化
function init() {
    //初始化透视相机
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, DefaultConst.defaultRadius * 10);
	//相机位置
	camera.position.x = DefaultConst.defaultRadius * 2.5;

	// THREE.Scene 对象是所有不同对象的容器,也就是说该对象保存所有物体、光源、摄像机以及渲染所需的其他对象
	scene = new THREE.Scene();

	// 灯光
	let light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 10, 5, 15 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0x444444 );
	light.position.set( -10, -5, -15 );
	scene.add( light );

	light = new THREE.AmbientLight( 0x444444 );
	scene.add( light );

	//初始化渲染器
	renderer = new THREE.WebGLRenderer( {antialias: true } );
	//设置渲染尺寸的大小
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor(currentParams.backgroundColor);
	//webgl渲染的canvas内容添加到dom元素上
	container = document.getElementById('container');
	container.appendChild(renderer.domElement);


	//控制器的自定义设置
	controls = new OrbitControls(camera,renderer.domElement);
	controls.addEventListener('change', render);
	controls.enablePan = false;
	controls.minDistance = DefaultConst.defaultRadius / 4.0;
	controls.maxDistance = DefaultConst.defaultRadius * 4.0;
	controls.zoomSpeed = DefaultConst.defaultRadius / 2.0;
	controls.target = new THREE.Vector3(0, 0, 0);

	//设置当前信息变化看板的参数
	initInfo();

	//初始化看板
	initGUI();

	//创建模型加载器
	objLoader = new OBJLoader(loadManager);

    //加载各类模型信息
    createPredefinedGeometries();

    //加载各类材质信息
	createPredefinedMaterials();

	//在场景中初始化几何形体
	createDefaultGeometry();

	//显示信息
	updateInfo();

	//初始化自动旋转功能
	updateScene();

	//窗口大小变化时相机随之变化
	onWindowResize();

	//Three.js执行渲染
	animate();
}


function updateScene() {
	if (DefaultConst.infoDirty) {
		updateInfo();
		DefaultConst.infoDirty = false;
	}
	if (panelShowParams.autoRotate) {
		let dTime = (Date.now() - startTime) * 0.0005;
		currentParams.mesh.rotation.x = dTime;
		currentParams.mesh.rotation.y = dTime;
		currentParams.wireMesh.rotation.x = dTime;
		currentParams.wireMesh.rotation.y = dTime;
		currentParams.origMesh.rotation.x = dTime;
		currentParams.origMesh.rotation.y = dTime;
	}
}

function animate() {
	render();
	//定时循环操作，调用animate函数逐帧重绘
	requestAnimationFrame(animate);
	controls.update();
}
//窗口变化
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

//渲染函数
function render() {
	updateScene();
	//执行渲染
	renderer.render( scene, camera );
}

function initGUI(){
	//dat.GUI中挂载各类下拉框和拉升条及回调函数，并且在内部执行回调操作为param的对应参数赋用户选择的值
	gui = new dat.GUI();
	gui.add(panelShowParams, 'geometry', DefaultConst.geometriesNamesSelected).name("几何形体").onChange(changeMeshGeometry);
	//设置细分等级范围
	paramControllers.subdivAmount = gui.add(panelShowParams, 'subdivAmount', 0, DefaultConst.subdivMax).name("细分等级").step(1).onChange(makeSubdivition);
	gui.add(panelShowParams, 'material', DefaultConst.materialNamesSelected).name("材质").onChange(changeMeshMaterial);
	gui.addColor(panelShowParams, 'meshColor').name('颜色').onChange(changeMeshColor);
	gui.add(panelShowParams, 'surface').name("展示/隐藏表面").onChange(changeMeshSurface);
	gui.addColor(panelShowParams, 'wireColor').name('线框颜色').onChange(changeWireMeshColor);
	gui.add(panelShowParams, 'wireframe').name("展示/隐藏线框").onChange(changeMeshWireframe);
	gui.addColor(panelShowParams, 'originalColor').name('初始颜色').onChange(changeOriginalColor);
	gui.add(panelShowParams, 'original').name('展示/隐藏初始').onChange(changeMeshOriginal);
	gui.addColor(panelShowParams, 'backgroundColor').name('背景色').onChange(changeBackgroundColor);
	gui.add(panelShowParams, 'autoRotate').name("自动旋转").onChange(changeAutoRotation);
}

function initInfo(){
	info = document.createElement('div');
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.style.color = '#ffffff';
	info.innerHTML = '';
	container.appendChild(info);
}

// 当前信息变更
function updateInfo() {
	info.innerHTML = '初始顶点数: ' + subdivider.info[0].vertexCount + ' | 初始面片数: ' + subdivider.info[0].faceCount;
	info.innerHTML += '<br>当前细分级别: ' + currentParams.subdivAmount;
	info.innerHTML += '<br>当前顶点数: ' + subdivider.info[currentParams.subdivAmount].vertexCount;
	info.innerHTML += ' | 当前面片数: ' + subdivider.info[currentParams.subdivAmount].faceCount;
}

//加载OBJ模型方法,加载到数组里
function loadAsset(predefinedName, assetUrl) {
	objLoader.load(assetUrl, function(object)
		{
			let geom = object.children[0].geometry;
			let stdGeom = new THREE.Geometry().fromBufferGeometry(geom);
			stdGeom.computeFaceNormals();
			stdGeom.mergeVertices();
			stdGeom.computeVertexNormals();
			normalizeGeometry(stdGeom);
			DefaultConst.predefinedGeometries[predefinedName] = stdGeom;
		}
	);
}