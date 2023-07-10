//使用的export default，所以不能加{}
import DefaultConst from './const.js';
//源码使用的module.exports，所以不能加{}
import Stats from 'three/examples/js/libs/stats.min'
import dat from 'three/examples/js/libs/dat.gui.min'

//源码使用的export，所以需要加{}，而且命名要相同
import {Subdivision} from './loop.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

let subdivider,objLoader,loadManager,fileOpen,info,gui,container,camera, controls, stats, scene, renderer,panelShowParams,SceneMeshObject = null;

//页面加载完成后调用init方法
window.addEventListener('load', init);


//细分操作 需要传入num - 用户选择细分等级
function makeSubdivision(num)
{
	//如果当前没有细分器，就创建一个
	if (!subdivider)
	{
		subdivider = new Subdivision(SceneMeshObject.originalGeometry);
	}
	//如果当前传入的细分等级num与目前渲染的细分等级subdivAmount相等，则不需要执行细分操作，否则执行
	if (num != SceneMeshObject.subdivAmount) {
		//为当前参数列表赋值
		SceneMeshObject.subdivAmount = num;
		//调用细分方法进行细分，得到细分后的模型
		//将场景中的模型对象进行跟新
		SceneMeshObject.currentGeometry = subdivider.subdivide(SceneMeshObject.subdivAmount);
		SceneMeshObject.mesh.geometry = SceneMeshObject.currentGeometry;
		SceneMeshObject.wireMesh.geometry = SceneMeshObject.currentGeometry;
		//设置是否显示原始模型
		SceneMeshObject.origMesh.visible = panelShowParams.original && num > 0;
		//每次细分后更新信息
		updateInfoBySubdivAmount();
	}
}



function changeMeshFromGeometry(geometry) {
	if (subdivider) {
		subdivider.dispose();
		subdivider = null;
		SceneMeshObject.subdivAmount = -1;
		panelShowParams.subdivAmount = 0;

	}
	SceneMeshObject.originalGeometry = geometry;
	SceneMeshObject.origMesh.geometry = SceneMeshObject.originalGeometry;
	SceneMeshObject.origMesh.visible = false;
	// 创建一个新的细分器
	subdivider = new Subdivision(SceneMeshObject.originalGeometry);
	//每次修改的时候都还原为0
	SceneMeshObject.subdivAmount = 0;
	SceneMeshObject.currentGeometry = subdivider.subdivide(SceneMeshObject.subdivAmount);
	SceneMeshObject.mesh.geometry = SceneMeshObject.currentGeometry;
	SceneMeshObject.wireMesh.geometry = SceneMeshObject.currentGeometry;
	//每次变换仍然更新细分数据
	updateInfoBySubdivAmount();
}

function changeMeshGeometry() {
	if (SceneMeshObject.currentGeometryName == 'OBJ file...') {
		SceneMeshObject.originalGeometry.dispose();
		SceneMeshObject.currentGeometryName = '';
	}

	if (panelShowParams.geometry == 'OBJ file...') {
		//触发click事件，弹出上传框
		fileOpen.click();
	} else {
		SceneMeshObject.currentGeometryName = panelShowParams.geometry;
		changeMeshFromGeometry(DefaultConst.predefinedGeometries[panelShowParams.geometry]);
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
	SceneMeshObject.mesh.material = DefaultConst.predefineMaterials[panelShowParams.material];
	SceneMeshObject.material = panelShowParams.material;
	SceneMeshObject.mesh.material.needsUpdate = true;
}

//网格颜色的切换
function changeMeshColor() {
	//通过panelShowParams转为three的颜色
	SceneMeshObject.meshColor = new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x')));
	DefaultConst.predefineMaterials['phongFlat'].color = SceneMeshObject.meshColor;
	DefaultConst.predefineMaterials['phongSmooth'].color = SceneMeshObject.meshColor;
	DefaultConst.predefineMaterials['lambert'].color = SceneMeshObject.meshColor;
	SceneMeshObject.mesh.material.needsUpdate = true;
}

//网格线颜色的切换
function changeWireMeshColor() {
	info.style.color = panelShowParams.wireColor;
	SceneMeshObject.wireColor = new THREE.Color(parseInt(panelShowParams.wireColor.replace('#', '0x')));
	SceneMeshObject.wireMat.color = SceneMeshObject.wireColor;
	SceneMeshObject.wireMat.needsUpdate = true;
}

//修改初始颜色
function changeOriginalColor() {
	SceneMeshObject.originalColor = new THREE.Color(parseInt(panelShowParams.originalColor.replace('#', '0x')));
	SceneMeshObject.origMat.color = SceneMeshObject.originalColor;
	SceneMeshObject.origMat.needsUpdate = true;
}

//修改背景颜色
function changeBackgroundColor() {
	SceneMeshObject.backgroundColor = new THREE.Color(parseInt(panelShowParams.backgroundColor.replace('#', '0x')));
	renderer.setClearColor(SceneMeshObject.backgroundColor);
}

//切换是否显示网格曲面
function changeMeshSurface() {
	SceneMeshObject.mesh.visible = panelShowParams.surface;
}

//切换是否显示网格线
function changeMeshWireframe() {
	SceneMeshObject.wireMesh.visible = panelShowParams.wireframe;
}

//原模型是否可见
function changeMeshOriginal() {
	//只有选择可见并且细分等级>0的情况下才可见原始线框
	SceneMeshObject.origMesh.visible = panelShowParams.original && SceneMeshObject.subdivAmount > 0;
}

//几何形体加入场景
function addGeometryIntoScene() {
	//根据当前面板的几何标识读取细分开始之前的几何模型
	SceneMeshObject.originalGeometry = DefaultConst.predefinedGeometries[panelShowParams.geometry];
	//细分器初始化
	subdivider = new Subdivision(SceneMeshObject.originalGeometry);
	//细分等级设定
	SceneMeshObject.subdivAmount = 0;
	//细分后的几何形体设定
	SceneMeshObject.currentGeometry = subdivider.subdivide(SceneMeshObject.subdivAmount);
	//使用three.js根据几何形体设置初始的网格
	SceneMeshObject.mesh = new THREE.Mesh(
		SceneMeshObject.currentGeometry
	);
	//加载默认材质
	changeMeshMaterial();

	//将形几何模型加入到THREE.Scene的场景里
	scene.add(SceneMeshObject.mesh);

	//three.js生成网格线并加入
	//几何体是不能被渲染的，只有几何体和材质结合成网格才能被渲染到屏幕上
	SceneMeshObject.wireMesh = new THREE.Mesh(
		SceneMeshObject.currentGeometry,
		SceneMeshObject.wireMat
	);
	//将细分后的几何线框载到场景
	scene.add(SceneMeshObject.wireMesh);

    //three.js生成原始线框并加入
	SceneMeshObject.origMesh = new THREE.Mesh(
		SceneMeshObject.originalGeometry,
		SceneMeshObject.origMat
	);
	//原始图形默认不可见
	SceneMeshObject.origMesh.visible = false;
	//将原始几何图形的几何线框加载到场景
	scene.add(SceneMeshObject.origMesh);
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
	loadAssetToPredefinedGeometries(DefaultConst.teapot, 'assets/teapot.obj');
	loadAssetToPredefinedGeometries(DefaultConst.bunny, 'assets/bunny.obj');
}

//创建各种材质
function loadPredefinedMaterials() {
	let commonPhongParams = {
		color: SceneMeshObject.meshColor,
		shininess: 40,
		specular: 0x222222
	};
	DefaultConst.predefineMaterials['phongFlat'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongFlat'].shading = THREE.FlatShading;
	DefaultConst.predefineMaterials['phongSmooth'] = new THREE.MeshPhongMaterial(commonPhongParams);
	DefaultConst.predefineMaterials['phongSmooth'].shading = THREE.SmoothShading;
	DefaultConst.predefineMaterials['lambert'] = new THREE.MeshLambertMaterial({color: SceneMeshObject.meshColor});
	DefaultConst.predefineMaterials['normal'] = new THREE.MeshNormalMaterial();
	// 创建线框材质
	SceneMeshObject.wireMat = new THREE.MeshBasicMaterial({
		color: SceneMeshObject.wireColor,
		wireframe: true
	});
	SceneMeshObject.origMat = new THREE.MeshBasicMaterial({
		color: SceneMeshObject.originalColor,
		wireframe: true
	});
}
//自动旋转开闭
function changeAutoRotation() {
	if (!panelShowParams.autoRotate) {
		SceneMeshObject.mesh.rotation.x = 0;
		SceneMeshObject.mesh.rotation.y = 0;
		SceneMeshObject.wireMesh.rotation.x = 0;
		SceneMeshObject.wireMesh.rotation.y = 0;
		SceneMeshObject.origMesh.rotation.x = 0;
		SceneMeshObject.origMesh.rotation.y = 0;
		DefaultConst.startTime = Date.now();
	}
}


//界面初始化
function init() {
	// THREE.Scene 对象是所有不同对象的容器,也就是说该对象保存所有物体、光源、摄像机以及渲染所需的其他对象
	scene = new THREE.Scene();
	//界面实时数据
    initPanelShowParam();

	//Three绑定到scene里的实时参数，只需要改变mesh参数，scene里的几何图形就会变化
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
	initUploadDiv();

    //加载各类模型信息
    loadPredefinedGeometries();

    //加载各类材质信息
	loadPredefinedMaterials();

	//在场景中添加几何形体
	addGeometryIntoScene();

	// //显示看板信息
	// updateInfoBySubdivAmount();

	//初始化自动旋转功能
	setAutoRotate();

	//Three.js执行渲染
	animate();
}


function setAutoRotate() {
	if (panelShowParams.autoRotate) {
		let dTime = (Date.now() - DefaultConst.startTime) * 0.0005;
		SceneMeshObject.mesh.rotation.x = dTime;
		SceneMeshObject.mesh.rotation.y = dTime;
		SceneMeshObject.wireMesh.rotation.x = dTime;
		SceneMeshObject.wireMesh.rotation.y = dTime;
		SceneMeshObject.origMesh.rotation.x = dTime;
		SceneMeshObject.origMesh.rotation.y = dTime;
	}
}

function animate() {
	render();
	//下次重绘之前，调用animate函数进行渲染
	requestAnimationFrame(animate);
	controls.update();
}

//渲染函数
function render() {
	//每次渲染后执行之前的旋转设置
	setAutoRotate();
	//每次渲染后统计性能信息
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

function initUploadDiv(){
	//创建一个file类型的div，接收.obj的文件，该div被点击后会弹出上传窗口
	fileOpen = document.createElement('input');
	fileOpen.type = 'file';
	fileOpen.accept = '.obj';
	fileOpen.style.visibility = 'hidden';
	//上传完毕后会调用加载函数
	fileOpen.onchange = (event)=>{
		const objFile = fileOpen.files[0];
		const url = window.URL.createObjectURL(objFile);
		loadAssetFromOBJ(url);
		//解决不能重复上传相同文件的问题
		event.target.value = null;
	};
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
	SceneMeshObject = {
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
	renderer.setClearColor(SceneMeshObject.backgroundColor);
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
function updateInfoBySubdivAmount() {
	info.innerHTML = '初始顶点数: ' + subdivider.cachedBandInfo[0].vertexCount + ' | 初始面片数: ' + subdivider.cachedBandInfo[0].faceCount;
	info.innerHTML += '<br>当前细分级别: ' + SceneMeshObject.subdivAmount;
	info.innerHTML += '<br>当前顶点数: ' + subdivider.cachedBandInfo[SceneMeshObject.subdivAmount].vertexCount;
	info.innerHTML += ' | 当前面片数: ' + subdivider.cachedBandInfo[SceneMeshObject.subdivAmount].faceCount;
}

//加载OBJ模型方法,加载到数组里
function loadAssetToPredefinedGeometries(predefinedName, assetUrl) {
	objLoader.load(assetUrl, function(object)
		{
			let geom = object.children[0].geometry;
			let stdGeom = new THREE.Geometry().fromBufferGeometry(geom);
			stdGeom.computeFaceNormals();
			stdGeom.mergeVertices();
			stdGeom.computeVertexNormals();
			normalizeGeometry(stdGeom);
			DefaultConst.predefinedGeometries[predefinedName] = stdGeom;
			geom.dispose();
		}
	);
}

function loadAssetFromOBJ(assetUrl) {
	objLoader.load(assetUrl, function(object)
		{
			let geom = object.children[0].geometry;
			let stdGeom = new THREE.Geometry().fromBufferGeometry(geom);
			stdGeom.computeFaceNormals();
			stdGeom.mergeVertices();
			stdGeom.computeVertexNormals();
			normalizeGeometry(stdGeom);
			//立刻加载
			changeMeshFromGeometry(stdGeom);
			SceneMeshObject.currentGeometryName = 'OBJ file...';
			geom.dispose();
		}
	);
}