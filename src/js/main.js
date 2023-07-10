//使用的export default，所以不能加{}
import defaultConst from './const.js';
import tools from './tools';
//源码使用的module.exports，所以不能加{}
import Stats from 'three/examples/js/libs/stats.min'
import dat from 'three/examples/js/libs/dat.gui.min'

//源码使用的export，所以需要加{}，而且命名要相同
import {Subdivision} from './loop'
import {SceneMesh}from './mesh'
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
		let geometry = subdivider.subdivide(num);
		//更新场景数据
		SceneMeshObject.subdivAmount = num;
		//判断是否显示原始模型（有可能是打开的，因为num=0未显示）
		SceneMeshObject.origMesh.visible = panelShowParams.original && num > 0;
		//调用细分方法进行细分，得到细分后的模型
		//将场景中的模型对象进行跟新
		SceneMeshObject.updateCurrentMesh(geometry);
		//每次细分后更新信息
		updateInfoBySubdivAmount();
	}
}



function changeMeshFromGeometry(originalGeometry,uploadFlag) {
	if (subdivider) {
		subdivider.dispose();
		subdivider = null;
		SceneMeshObject.subdivAmount = -1;
		panelShowParams.subdivAmount = 0;
	}
	//为上传的文件起名
	if(uploadFlag)
	{
		SceneMeshObject.currentGeometryName = 'OBJ file...';
	}
	else
	{
		SceneMeshObject.currentGeometryName = panelShowParams.geometry;
	}
	SceneMeshObject.updateOriginalMesh(originalGeometry);
	SceneMeshObject.origMesh.visible = false;
	// 创建一个新的细分器,每次细分都是从最原始的图形开始
	subdivider = new Subdivision(originalGeometry);
	//每次修改的时候都还原为0
	const currentGeometry = subdivider.subdivide(0);
	SceneMeshObject.subdivAmount = 0;
	SceneMeshObject.updateCurrentMesh(currentGeometry);
	//每次变换仍然更新细分数据
	updateInfoBySubdivAmount();
}

function changeMeshGeometry() {
	//如果已经在使用上传的文件，则将之清除
	if (SceneMeshObject.currentGeometryName == 'OBJ file...') {
		SceneMeshObject.originalGeometry.dispose();
		SceneMeshObject.currentGeometryName = '';
	}
	//如果此时的change是上传的，则执行上传操作
	if (panelShowParams.geometry == 'OBJ file...') {
		//触发click事件，弹出上传框
		fileOpen.click();
	}
	else
	{
		//否则执行changeMeshFromGeometry
		changeMeshFromGeometry(defaultConst.predefinedGeometries[panelShowParams.geometry],false);
	}
}





//材质的切换
function changeMeshMaterial() {
	SceneMeshObject.mesh.material = defaultConst.predefineMaterials[panelShowParams.material];
	SceneMeshObject.material = panelShowParams.material;
	SceneMeshObject.mesh.material.needsUpdate = true;
}

//网格颜色的切换
function changeMeshColor() {
	//通过panelShowParams转为three的颜色
	SceneMeshObject.meshColor = new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x')));
	SceneMeshObject.mesh.material.needsUpdate = true;
	//修改材质颜色
	defaultConst.changePredefinedMaterialsColor(SceneMeshObject.meshColor);
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
	SceneMeshObject.originalGeometry = defaultConst.predefinedGeometries[panelShowParams.geometry];
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
	defaultConst.loadPredefinedGeometries();
	// // 加载单独的obj文件
	loadAsset(defaultConst.teapot, 'assets/teapot.obj');
	loadAsset(defaultConst.bunny, 'assets/bunny.obj');
}

//创建各种材质
function loadPredefinedMaterials() {
	const commonPhongParams = {
		color: SceneMeshObject.meshColor,
		shininess: 40,
		specular: 0x222222
	};
	const commonLambert = {
		color: SceneMeshObject.meshColor
	}
	defaultConst.loadPredefinedMaterials(commonPhongParams,commonLambert);
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
	}
}


//界面初始化
function init() {
	// THREE.Scene 对象是所有不同对象的容器,也就是说该对象保存所有物体、光源、摄像机以及渲染所需的其他对象
	scene = new THREE.Scene();
	//界面实时数据
    initPanelShowParam();

	//Three绑定到scene里的实时参数，只需要改变mesh参数，scene里的几何图形就会变化
	SceneMeshObject = new SceneMesh(panelShowParams)

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

	//显示看板信息
	updateInfoBySubdivAmount();

	//初始化自动旋转功能
	setAutoRotate();

	//Three.js执行渲染
	animate();
}


function setAutoRotate() {
	if (panelShowParams.autoRotate) {
		let dTime = (Date.now() - defaultConst.startTime) * 0.0005;
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
	gui.add(panelShowParams, 'geometry', defaultConst.geometriesNamesSelected).name("几何形体").onChange(changeMeshGeometry);
	//设置细分等级范围，步长为1
	gui.add(panelShowParams, 'subdivAmount', 0, defaultConst.subdivMax).name("细分等级").step(1).onChange(makeSubdivision);
	gui.add(panelShowParams, 'material', defaultConst.materialNamesSelected).name("材质").onChange(changeMeshMaterial);
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
		loadAsset("",url);
		//解决不能重复上传相同文件的问题
		event.target.value = null;
	};
}
function initPanelShowParam() {
	//界面的初始化参数
	panelShowParams = {
		geometry: defaultConst.tetrahedron,
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

function initCamera(){
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, defaultConst.defaultRadius * 10);
	//相机位置
	camera.position.x = defaultConst.defaultRadius * 2.5;
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
	controls.minDistance = defaultConst.defaultRadius / 4.0;
	controls.maxDistance = defaultConst.defaultRadius * 4.0;
	controls.zoomSpeed = defaultConst.defaultRadius / 2.0;
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
function loadAsset(predefinedName, assetUrl) {
	objLoader.load(assetUrl, function(object)
		{
			let buffer = object.children[0].geometry;
			let geometry = tools.formLoadBufferGeometry(buffer);
			tools.normalizeGeometry(geometry);
			//说明是上传而来的obj
			if(predefinedName == "")
			{
				//加载处理后的文件
				changeMeshFromGeometry(geometry,true);
			}
			else
			{
				defaultConst.predefinedGeometries[predefinedName] = geometry;
			}
			buffer.dispose();
		}
	);
}