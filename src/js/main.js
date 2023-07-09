//使用的export default，所以不能加{}
import DefaultConst from './const.js';
//源码使用的module.exports，所以不能加{}
import Stats from 'three/examples/js/libs/stats.min'
import dat from 'three/examples/js/libs/dat.gui.min'

//源码使用的export，所以需要加{}，而且命名要相同
import {Subdivision} from './loop.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

let subdivider,objLoader,loadManager,fopen,info,gui,container,camera, controls, stats, scene, renderer,panelShowParams,panelShowThreeParams = null;

//页面加载完成后调用init方法
window.addEventListener('load', init);


//细分操作 需要传入num - 用户选择细分等级
function makeSubdivision(num)
{
	//如果当前没有细分器，就创建一个
	if (!subdivider)
	{
		subdivider = new Subdivision(panelShowThreeParams.originalGeometry);
	}
	//如果当前传入的细分等级num与目前渲染的细分等级subdivAmount相等，则不需要执行细分操作，否则执行
	if (num != panelShowThreeParams.subdivAmount) {
		//为当前参数列表赋值
		panelShowThreeParams.subdivAmount = num;
		//调用细分方法进行细分，得到细分后的模型
		//将模型赋到当前参数列表中
		panelShowThreeParams.currentGeometry = subdivider.subdivide(num);
		panelShowThreeParams.mesh.geometry = panelShowThreeParams.currentGeometry;
		panelShowThreeParams.wireMesh.geometry = panelShowThreeParams.currentGeometry;
		//设置是否显示原始模型
		panelShowThreeParams.origMesh.visible = panelShowParams.original && num > 0;
		//每次细分后更新信息
		updateInfo();
	}
}



function changeMeshFromGeometry(geometry) {
	if (subdivider) {
		subdivider.dispose();
		subdivider = null;
		panelShowThreeParams.subdivAmount = -1;
		panelShowParams.subdivAmount = 0;

	}
	panelShowThreeParams.originalGeometry = geometry;
	panelShowThreeParams.origMesh.geometry = panelShowThreeParams.originalGeometry;
	panelShowThreeParams.origMesh.visible = false;
	// 创建一个新的细分器
	subdivider = new Subdivision(panelShowThreeParams.originalGeometry);
	panelShowThreeParams.currentGeometry = subdivider.subdivide(0);
	panelShowThreeParams.subdivAmount = 0;
	panelShowThreeParams.mesh.geometry = panelShowThreeParams.currentGeometry;
	panelShowThreeParams.wireMesh.geometry = panelShowThreeParams.currentGeometry;
	//每次变换仍然更新细分数据
	updateInfo();
}

function changeMeshGeometry() {
	if (panelShowThreeParams.currentGeometryName == 'OBJ file...') {
		debugger
		panelShowThreeParams.originalGeometry.dispose();
		panelShowThreeParams.currentGeometryName = '';
	}
	if (panelShowParams.geometry == 'OBJ file...') {
		fopen.click();
	} else {
		changeMeshFromGeometry(DefaultConst.predefinedGeometries[panelShowParams.geometry]);
		panelShowThreeParams.currentGeometryName = panelShowParams.geometry;
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
	panelShowThreeParams.mesh.material = DefaultConst.predefineMaterials[panelShowParams.material];
	panelShowThreeParams.material = panelShowParams.material;
	panelShowThreeParams.mesh.material.needsUpdate = true;
}

//网格颜色的切换
function changeMeshColor() {
	//通过panelShowParams转为three的颜色
	panelShowThreeParams.meshColor = new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x')));
	DefaultConst.predefineMaterials['phongFlat'].color = panelShowThreeParams.meshColor;
	DefaultConst.predefineMaterials['phongSmooth'].color = panelShowThreeParams.meshColor;
	DefaultConst.predefineMaterials['lambert'].color = panelShowThreeParams.meshColor;
	panelShowThreeParams.mesh.material.needsUpdate = true;
}

//网格线颜色的切换
function changeWireMeshColor() {
	info.style.color = panelShowParams.wireColor;
	panelShowThreeParams.wireColor = new THREE.Color(parseInt(panelShowParams.wireColor.replace('#', '0x')));
	panelShowThreeParams.wireMat.color = panelShowThreeParams.wireColor;
	panelShowThreeParams.wireMat.needsUpdate = true;
}

//修改初始颜色
function changeOriginalColor() {
	panelShowThreeParams.originalColor = new THREE.Color(parseInt(panelShowParams.originalColor.replace('#', '0x')));
	panelShowThreeParams.origMat.color = panelShowThreeParams.originalColor;
	panelShowThreeParams.origMat.needsUpdate = true;
}

//修改背景颜色
function changeBackgroundColor() {
	panelShowThreeParams.backgroundColor = new THREE.Color(parseInt(panelShowParams.backgroundColor.replace('#', '0x')));
	renderer.setClearColor(panelShowThreeParams.backgroundColor);
}

//切换是否显示网格曲面
function changeMeshSurface() {
	panelShowThreeParams.mesh.visible = panelShowParams.surface;
}

//切换是否显示网格线
function changeMeshWireframe() {
	panelShowThreeParams.wireMesh.visible = panelShowParams.wireframe;
}

//原模型是否可见
function changeMeshOriginal() {
	//只有选择可见并且细分等级>0的情况下才可见原始线框
	panelShowThreeParams.origMesh.visible = panelShowParams.original && panelShowThreeParams.subdivAmount > 0;
}

//默认几何形体加入场景
function createDefaultGeometry() {
	//读取初始的几何模型
	panelShowThreeParams.originalGeometry = DefaultConst.predefinedGeometries[panelShowParams.geometry];
	//细分器初始化
	subdivider = new Subdivision(panelShowThreeParams.originalGeometry);
	//细分等级设定
	panelShowThreeParams.subdivAmount = 0;
	//细分后的几何形体设定
	panelShowThreeParams.currentGeometry = subdivider.subdivide(panelShowThreeParams.subdivAmount);
	//使用three.js根据几何形体设置初始的网格
	panelShowThreeParams.mesh = new THREE.Mesh(
		panelShowThreeParams.currentGeometry
	);
	//加载默认材质
	changeMeshMaterial();

	//将形初始几何模型加入到THREE.Scene的场景里
	scene.add(panelShowThreeParams.mesh);

	//three.js生成网格线并加入
	//几何体是不能被渲染的，只有几何体和材质结合成网格才能被渲染到屏幕上
	panelShowThreeParams.wireMesh = new THREE.Mesh(
		panelShowThreeParams.currentGeometry,
		panelShowThreeParams.wireMat
	);
	//将细分后的几何图形加载到场景
	scene.add(panelShowThreeParams.wireMesh);

    //three.js生成原始线框并加入
	panelShowThreeParams.origMesh = new THREE.Mesh(
		panelShowThreeParams.originalGeometry,
		panelShowThreeParams.origMat
	);
	//原始图形默认不可见
	panelShowThreeParams.origMesh.visible = false;
	//将默认的几何图形加载到场景
	scene.add(panelShowThreeParams.origMesh);
}

//three.js提供的各类模型，对模型进行初始化
function loadPredefinedGeometries() {
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
function loadPredefinedMaterials() {
	let commonPhongParams = {
		color: panelShowThreeParams.meshColor,
		shininess: 40,
		specular: 0x222222
	};
	DefaultConst.predefineMaterials['phongFlat'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongFlat'].shading = THREE.FlatShading;
	DefaultConst.predefineMaterials['phongSmooth'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongSmooth'].shading = THREE.SmoothShading;
	DefaultConst.predefineMaterials['lambert'] = new THREE.MeshLambertMaterial({color: panelShowThreeParams.meshColor});
	DefaultConst.predefineMaterials['normal'] = new THREE.MeshNormalMaterial();
	// 创建线框材质
	panelShowThreeParams.wireMat = new THREE.MeshBasicMaterial({
		color: panelShowThreeParams.wireColor,
		wireframe: true
	});
	panelShowThreeParams.origMat = new THREE.MeshBasicMaterial({
		color: panelShowThreeParams.originalColor,
		wireframe: true
	});
}
//自动旋转开闭
function changeAutoRotation() {
	if (!panelShowParams.autoRotate) {
		panelShowThreeParams.mesh.rotation.x = 0;
		panelShowThreeParams.mesh.rotation.y = 0;
		panelShowThreeParams.wireMesh.rotation.x = 0;
		panelShowThreeParams.wireMesh.rotation.y = 0;
		panelShowThreeParams.origMesh.rotation.x = 0;
		panelShowThreeParams.origMesh.rotation.y = 0;
		DefaultConst.startTime = Date.now();
	}
}


//界面初始化
function init() {
	// THREE.Scene 对象是所有不同对象的容器,也就是说该对象保存所有物体、光源、摄像机以及渲染所需的其他对象
	scene = new THREE.Scene();
	//界面实时数据
    initPanelShowParam();
	//Three实时参数
	initCurrentParam();

    //1、初始化透视相机
	initCamera();

	//2、初始化灯光
	initLight();

	//3、初始化性能检测stats组件
	initStats();

	//4、初始化渲染器
    initRenderer();

	//5、控制器的自定义设置
	initOrbitControl();

	//6、设置当前信息变化看板
	initInfoBand();

	//7、初始化看板，与PanelShowParams双向绑定
	initGUI();

	//8、创建模型加载器
	objLoader = new OBJLoader(loadManager);

    //加载各类模型信息
    loadPredefinedGeometries();

    //加载各类材质信息
	loadPredefinedMaterials();

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
	if (panelShowParams.autoRotate) {
		let dTime = (Date.now() - DefaultConst.startTime) * 0.0005;
		panelShowThreeParams.mesh.rotation.x = dTime;
		panelShowThreeParams.mesh.rotation.y = dTime;
		panelShowThreeParams.wireMesh.rotation.x = dTime;
		panelShowThreeParams.wireMesh.rotation.y = dTime;
		panelShowThreeParams.origMesh.rotation.x = dTime;
		panelShowThreeParams.origMesh.rotation.y = dTime;
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
	stats.update();
	//执行渲染
	renderer.render( scene, camera );
}

function initGUI(){
	//dat.GUI中挂载各类下拉框和拉升条及回调函数，并且在内部执行回调操作为param的对应参数赋用户选择的值
	gui = new dat.GUI();
	//gui.add - {对象、对应的属性}、数组(设置为下拉框)
	//可对数据进行双向绑定，数据变化时绑定的对象的值也会发生变化
	gui.add(panelShowParams, 'geometry', DefaultConst.geometriesNamesSelected).name("几何形体").onChange(changeMeshGeometry);
	//设置细分等级范围，步长为1
	gui.add(panelShowParams, 'subdivAmount', 0, DefaultConst.subdivMax).name("细分等级").step(1).onChange(makeSubdivision);
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
function initPanelShowParam() {
	//界面的初始化参数
	panelShowParams = {
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
}

function initCurrentParam(){
	panelShowThreeParams = {
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
}
function initCamera(){
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, DefaultConst.defaultRadius * 10);
	//相机位置
	camera.position.x = DefaultConst.defaultRadius * 2.5;
}
function initLight(){
	let light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 10, 5, 15 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0x444444 );
	light.position.set( -10, -5, -15 );
	scene.add( light );

	light = new THREE.AmbientLight( 0x444444 );
	scene.add( light );
}

function initStats(){
	stats = new Stats();
	stats.dom.style.position = 'absolute';
	stats.dom.style.top = '10px';
	stats.dom.style.left = '10px';
	stats.showPanel(0);
	document.body.appendChild(stats.dom);
}

function initRenderer(){
	renderer = new THREE.WebGLRenderer( {antialias: true } );
	//设置渲染尺寸的大小
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor(panelShowThreeParams.backgroundColor);
	//webgl渲染的canvas内容添加到dom元素上
	container = document.getElementById('container');
	container.appendChild(renderer.domElement);
}

function initOrbitControl(){
	controls = new OrbitControls(camera,renderer.domElement);
	//操作器变化时立即渲染
	controls.addEventListener('change', render);
	controls.enablePan = false;
	controls.minDistance = DefaultConst.defaultRadius / 4.0;
	controls.maxDistance = DefaultConst.defaultRadius * 4.0;
	controls.zoomSpeed = DefaultConst.defaultRadius / 2.0;
	controls.target = new THREE.Vector3(0, 0, 0);
}

function initInfoBand(){
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
	info.innerHTML = '初始顶点数: ' + subdivider.cachedBandInfo[0].vertexCount + ' | 初始面片数: ' + subdivider.cachedBandInfo[0].faceCount;
	info.innerHTML += '<br>当前细分级别: ' + panelShowThreeParams.subdivAmount;
	info.innerHTML += '<br>当前顶点数: ' + subdivider.cachedBandInfo[panelShowThreeParams.subdivAmount].vertexCount;
	info.innerHTML += ' | 当前面片数: ' + subdivider.cachedBandInfo[panelShowThreeParams.subdivAmount].faceCount;
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