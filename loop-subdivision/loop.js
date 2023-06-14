'use-strict';

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
let params = {
	geometry: tetrahedron,
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
	currentGeometryName: params.geometry,
	subdivAmount: -1,
	originalGeometry: null,
	currentGeometry: null,
	mesh: null,
	wireMesh: null,
	origMesh: null,
	wireMat: null,
	origMat: null,
	meshColor: new THREE.Color(parseInt(params.meshColor.replace('#', '0x'))),
	wireColor: new THREE.Color(parseInt(params.wireColor.replace('#', '0x'))),
	originalColor: new THREE.Color(parseInt(params.originalColor.replace('#', '0x'))),
	backgroundColor: new THREE.Color(parseInt(params.backgroundColor.replace('#', '0x'))),
	material: params.material,
};

//新的面对象，e为坐标
let EMFace = function() {
	this.e = new Uint32Array(3);
}

//新的顶点对象，e为坐标
let EMVertex = function() {
	this.e = [];
}

//定义数据结构EMEdge
let EMEdge = function() {
	this.v = new Uint32Array(2);
	this.f = new Uint32Array(2);
	this.ov = new Uint32Array(2);
	this.getOpposite = function(vi) {
		return (this.v[0] == vi ? this.v[1] : this.v[0]);
	}
}

let EdgeMesh = function() {
	//面集合
	this.faces = [];
	//顶点集合
	this.vertices = [];
	//边集合
	this.edges = [];
    //边表，使用哈希表更快的查找，以避免双循环，减少时间复杂度
	this.edgeMap = [];
	// v0 - 第一个顶点的索引
	// v1 - 第二个顶点的索引
	// fi - 面的索引
	// ei - 面上边的索引
	// ov - 当前面边的对顶点
	this.processEdge = function(v0, v1, fi, ei, ov) {
		const minV = Math.min(v0, v1);
		const maxV = Math.max(v0, v1);
		let edgeIndex = -1;
		let edgeKey = minV.toString() + '_' + maxV.toString();
		if (edgeKey in this.edgeMap) {
			edgeIndex = this.edgeMap[edgeKey];
		} else {
			this.edgeMap[edgeKey] = this.edges.length;
		}
		// 如果没找到索引，这就是一条新的边
		if (-1 == edgeIndex) {
			let edge = new EMEdge;
			edge.v[0] = minV;
			edge.v[1] = maxV;
			edge.f[0] = fi;
			edge.ov[0] = ov;
			edge.f[1] = uint32Max;
			edge.ov[1] = ov;
			edgeIndex = this.edges.length;
			this.edges.push(edge);
			// 为顶点添加边的信息
			this.vertices[minV].e.push(edgeIndex);
			this.vertices[maxV].e.push(edgeIndex);
		} else {
			// 给点添加另一个面
			this.edges[edgeIndex].f[1] = fi;
			this.edges[edgeIndex].ov[1] = ov;
		}
		// 更新面数组中边的索引
		this.faces[fi].e[ei] = edgeIndex;
	}

	this.generate = function(vertices, indices) {
		// 创建所有的顶点
		for (let vi = 0, vil = vertices.length; vi < vil; vi += 3) {
			this.vertices.push(new EMVertex);
		}
		// 遍历索引，每3个点组成一个三角形
		for (let fi = 0, fil = indices.length; fi < fil; fi += 3) {
			this.faces.push(new EMFace);
			// 遍历顶点检查边
			const faceArrayIndex = fi / 3;
			this.processEdge(indices[fi    ], indices[fi + 1], faceArrayIndex, 0, indices[fi + 2]);
			this.processEdge(indices[fi + 1], indices[fi + 2], faceArrayIndex, 1, indices[fi    ]);
			this.processEdge(indices[fi + 2], indices[fi    ], faceArrayIndex, 2, indices[fi + 1]);
		}
	}
}
//求β需要的计算因子
let BetaValencyCache = function(maxValency) {
	this.cache = new Float32Array(maxValency + 1);
	this.cache[0] = 0.0;
	this.cache[1] = 0.0;
	this.cache[2] = 1.0 / 8.0;
	this.cache[3] = 3.0 / 16.0;
	for (let i = 4; i < maxValency + 1; ++i) {
		this.cache[i] = (1.0 / i) * (5.0 / 8.0 - Math.pow( 3.0 / 8.0 + (1.0 / 4.0) * Math.cos( 2.0 * Math.PI / i ), 2.0));
	}
}


//定义细分器 构造函数需要传入一个模型geometry
let Subdivision = function(geometry) {
	if (geometry instanceof THREE.Geometry) {
		this.initialGeometry = new THREE.BufferGeometry();
		let vertices = new Float32Array(geometry.vertices.length * 3);
		for (let i = 0, il = geometry.vertices.length; i < il; ++i) {
			vertices[i * 3 + 0] = geometry.vertices[i].x;
			vertices[i * 3 + 1] = geometry.vertices[i].y;
			vertices[i * 3 + 2] = geometry.vertices[i].z;
		}
		let indices = new Uint32Array(geometry.faces.length * 3);
		for (let i = 0, il = geometry.faces.length; i < il; ++i) {
			indices[i * 3 + 0] = geometry.faces[i].a;
			indices[i * 3 + 1] = geometry.faces[i].b;
			indices[i * 3 + 2] = geometry.faces[i].c;
		}
		this.initialGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
		this.initialGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
		this.initialGeometry.computeVertexNormals();
	} else {
		this.initialGeometry = new THREE.BufferGeometry().copy(geometry);
	}
	this.initialGeometry.computeBoundingSphere();
	this.cachedSubdivisions = [];
	this.info = [{
		vertexCount: this.initialGeometry.getAttribute('position').array.length / 3,
		faceCount: this.initialGeometry.getIndex().array.length / 3
	}];

	//下面是各种函数调用的定义
	this.dispose = function dispose() {
		this.initialGeometry.dispose();
		for (let i = 0, il = this.cachedSubdivisions.length; i < il; ++i) {
			this.cachedSubdivisions[i].dispose();
		}
	}

	this.subdivide = function subdivide(num) {
		if (num == 0) {
			return this.initialGeometry;
		} else if (this.cachedSubdivisions[num - 1]) {
			return this.cachedSubdivisions[num - 1];
		} else {
			let previousSubdiv = this.subdivide(num - 1);
			let subdivided = this.subdivideGeometry(previousSubdiv);
			//更新看板信息，展示当前顶点数和面片数
			this.info[num] = {
				vertexCount: subdivided.getAttribute('position').array.length / 3,
				faceCount: subdivided.getIndex().array.length / 3
			};
			//存入缓存中
			this.cachedSubdivisions[num - 1] = subdivided;
			return subdivided;
		}
	}

	this.subdivideGeometry = function subdivideGeometry(buffGeom) {
		let retval = new THREE.BufferGeometry();
		//顶点缓存
		let oldVertexBuffer = buffGeom.getAttribute('position').array;
		//索引缓存
		let oldIndexBuffer = buffGeom.getIndex().array;
		let edgeMesh = new EdgeMesh;
		edgeMesh.generate(oldVertexBuffer, oldIndexBuffer);
		//初始顶点数目
		const oldVertCount = edgeMesh.vertices.length;
		//初始边数目
		const oldEdgeCount = edgeMesh.edges.length;
		//初始面数目
		const oldFaceCount = edgeMesh.faces.length;

		// 对一个三角形面片细分时，将增加4个面，每个面拥有3条新边，每个边细分为2条新边
		//  o---o---o
		//   \ / \ /
		//    o---o
		//     \ /
		//      o
		//
		const Chi = oldVertCount - oldEdgeCount + oldFaceCount;
		const newEdgeCount = oldEdgeCount * 2 + oldFaceCount * 3;
		const newFaceCount = oldFaceCount * 4;
		const newVertCount = newEdgeCount - newFaceCount + Chi;


        //  loop算法
        //  Step 1 - 计算原顶点更新后的坐标
		//计算β值
		let maxValency = -1;
		for (let vi = 0; vi < oldVertCount; ++vi) {
			maxValency = Math.max(maxValency, edgeMesh.vertices[vi].e.length);
		}
		if (2 >= maxValency) {
			throw Error('This is no mesh at all');
		}
		let betaValCache = new BetaValencyCache(maxValency);

		// 分配新的顶点数组
		let newVertexBuffer = new Float32Array(newVertCount * 3);

		for (let i = 0; i < oldVertCount; ++i) {
			// 保存顶点的值，将会重复利用
			const vertexValency = edgeMesh.vertices[i].e.length;
			// 为顶点获取适当的值
			const beta = betaValCache.cache[vertexValency];
			const vertexWeightBeta = 1.0 - vertexValency * beta;

			// 根据β值权重进行定点计算
			let x = vertexWeightBeta * oldVertexBuffer[i * 3    ];
			let y = vertexWeightBeta * oldVertexBuffer[i * 3 + 1];
			let z = vertexWeightBeta * oldVertexBuffer[i * 3 + 2];
			for (let j = 0; j < vertexValency; ++j) {
				const oppositeIndex = edgeMesh.edges[edgeMesh.vertices[i].e[j]].getOpposite(i);
				x += beta * oldVertexBuffer[oppositeIndex * 3    ];
				y += beta * oldVertexBuffer[oppositeIndex * 3 + 1];
				z += beta * oldVertexBuffer[oppositeIndex * 3 + 2];
			}
			// 添加更新后的顶点值
			newVertexBuffer[i * 3    ] = x;
			newVertexBuffer[i * 3 + 1] = y;
			newVertexBuffer[i * 3 + 2] = z;
		}

		// Step 2 - 计算新的顶点信息
		//     1/8
		//     / \
		//    /   \
		//   /     \
		// 3/8 --- 3/8
		//   \     /
		//    \   /
		//     \ /
		//     1/8
		for (let i = 0; i < oldEdgeCount; ++i) {
			const ev0 = edgeMesh.edges[i].v[0];
			const ev1 = edgeMesh.edges[i].v[1];
			const fv0 = edgeMesh.edges[i].ov[0];
			const fv1 = edgeMesh.edges[i].ov[1];
			let x = (3.0 / 8.0) * (oldVertexBuffer[ev0 * 3    ] + oldVertexBuffer[ev1 * 3    ]);
			let y = (3.0 / 8.0) * (oldVertexBuffer[ev0 * 3 + 1] + oldVertexBuffer[ev1 * 3 + 1]);
			let z = (3.0 / 8.0) * (oldVertexBuffer[ev0 * 3 + 2] + oldVertexBuffer[ev1 * 3 + 2]);
			x += (1.0 / 8.0) * (oldVertexBuffer[fv0 * 3    ] + oldVertexBuffer[fv1 * 3    ]);
			y += (1.0 / 8.0) * (oldVertexBuffer[fv0 * 3 + 1] + oldVertexBuffer[fv1 * 3 + 1]);
			z += (1.0 / 8.0) * (oldVertexBuffer[fv0 * 3 + 2] + oldVertexBuffer[fv1 * 3 + 2]);
			// 新的顶点索引值
			const nvi = oldVertCount + i;
			// 设置新的顶点值
			newVertexBuffer[nvi * 3    ] = x;
			newVertexBuffer[nvi * 3 + 1] = y;
			newVertexBuffer[nvi * 3 + 2] = z;
		}

		// Step 3 - 对索引进行计算
		// ov2 --- nv1 --- ov1
		//   \     / \     /
		//    \   /   \   /
		//     \ /     \ /
		//     nv2 --- nv0
		//       \     /
		//        \   /
		//         \ /
		//         ov0
		// ov == 旧顶点; nv == 新顶点
		// 新面的索引如下所示：
		//  ov0  nv0  nv2
		//  nv0  ov1  nv1
		//  nv1  ov2  nv2
		//  nv0  nv1  nv2
		//
		let newIndexBuffer = new Uint32Array(newFaceCount * 3);
		for (let i = 0; i < oldFaceCount; ++i) {
			const ov0 = oldIndexBuffer[i * 3    ];
			const ov1 = oldIndexBuffer[i * 3 + 1];
			const ov2 = oldIndexBuffer[i * 3 + 2];
			// 通过网格面获得新的顶点索引信息，因为网格面保存了边的索引信息
			// 在新的网格体里，边的索引顺序和新顶点的索引构造顺序相同
			// 只需要索引加上旧顶点计数的偏移量即可
			const nv0 = oldVertCount + edgeMesh.faces[i].e[0];
			const nv1 = oldVertCount + edgeMesh.faces[i].e[1];
			const nv2 = oldVertCount + edgeMesh.faces[i].e[2];
			// 添加新的索引到缓存中
			const offset = i * 12; // 4 * 3

			newIndexBuffer[offset     ] = ov0;
			newIndexBuffer[offset +  1] = nv0;
			newIndexBuffer[offset +  2] = nv2;

			newIndexBuffer[offset +  3] = nv0;
			newIndexBuffer[offset +  4] = ov1;
			newIndexBuffer[offset +  5] = nv1;

			newIndexBuffer[offset +  6] = nv1;
			newIndexBuffer[offset +  7] = ov2;
			newIndexBuffer[offset +  8] = nv2;

			newIndexBuffer[offset +  9] = nv0;
			newIndexBuffer[offset + 10] = nv1;
			newIndexBuffer[offset + 11] = nv2;
		}

		retval.addAttribute('position', new THREE.BufferAttribute(newVertexBuffer, 3));
		retval.setIndex(new THREE.BufferAttribute(newIndexBuffer, 1));

		// 清空当前网格
		delete edgeMesh;
		retval.computeBoundingSphere();
		retval.computeVertexNormals();
		return retval;
	}
}


//细分操作 需要传入num - 用户选择细分等级
function subdivide(num) {
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
		let subdivGeom = subdivider.subdivide(num)
		//将模型赋到当前参数列表中
		currentParams.currentGeometry = subdivGeom;
		currentParams.mesh.geometry = currentParams.currentGeometry;
		currentParams.wireMesh.geometry = currentParams.currentGeometry;
		//设置是否显示原始模型
		currentParams.origMesh.visible = params.original && num > 0;
		//更新信息
		updateInfo();
	}
}

// 当前信息变更
function updateInfo() {
	info.innerHTML = '初始顶点数: ' + subdivider.info[0].vertexCount + ' | 初始面片数: ' + subdivider.info[0].faceCount;
	info.innerHTML += '<br>当前细分级别: ' + currentParams.subdivAmount;
	info.innerHTML += '<br>当前顶点数: ' + subdivider.info[currentParams.subdivAmount].vertexCount;
	info.innerHTML += ' | 当前面片数: ' + subdivider.info[currentParams.subdivAmount].faceCount;
}

function changeMeshFromGeometry(geometry) {
	if (subdivider) {
		subdivider.dispose();
		delete subdivider;
		subdivider = null;
		currentParams.subdivAmount = -1;
		params.subdivAmount = 0;
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
	if (params.geometry == 'OBJ file...') {
		fopen.click();
	} else {
		changeMeshFromGeometry(predefinedGeometries[params.geometry]);
		currentParams.currentGeometryName = params.geometry;
	}
}

// 将图形初始化到屏幕中央
function normalizeGeometry(geom) {
	// 计算边界范围- 得到半径和物体中心
	geom.computeBoundingSphere();
	//用球半径求比例尺因子
	const scaleFactor = defaultRadius / geom.boundingSphere.radius;
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

//加载OBJ模型方法
function loadAsset(predefinedName, assetUrl) {
	objLoader.load(assetUrl,
		function(object) {
			let geom = object.children[0].geometry;
			let stdGeom = new THREE.Geometry().fromBufferGeometry(geom);
			stdGeom.computeFaceNormals();
			stdGeom.mergeVertices();
			stdGeom.computeVertexNormals();
			normalizeGeometry(stdGeom);
			predefinedGeometries[predefinedName] = stdGeom;
		}
	);
}

//材质的切换
function changeMeshMaterial() {
	currentParams.mesh.material = materials[params.material];
	currentParams.material = params.material;
	currentParams.mesh.material.needsUpdate = true;
}

//网格颜色的切换
function changeMeshColor() {
	currentParams.meshColor = new THREE.Color(parseInt(params.meshColor.replace('#', '0x')));
	materials['phongFlat'].color = currentParams.meshColor;
	materials['phongSmooth'].color = currentParams.meshColor;
	materials['lambert'].color = currentParams.meshColor;
	currentParams.mesh.material.needsUpdate = true;
}

//网格线颜色的切换
function changeWireMeshColor() {
	info.style.color = params.wireColor;
	currentParams.wireColor = new THREE.Color(parseInt(params.wireColor.replace('#', '0x')));
	currentParams.wireMat.color = currentParams.wireColor;
	currentParams.wireMat.needsUpdate = true;
}

//修改初始颜色
function changeOriginalColor() {
	currentParams.originalColor = new THREE.Color(parseInt(params.originalColor.replace('#', '0x')));
	currentParams.origMat.color = currentParams.originalColor;
	currentParams.origMat.needsUpdate = true;
}

//修改背景颜色
function changeBackgroundColor() {
	currentParams.backgroundColor = new THREE.Color(parseInt(params.backgroundColor.replace('#', '0x')));
	renderer.setClearColor(currentParams.backgroundColor);
}

//切换是否显示网格曲面
function changeMeshSurface() {
	currentParams.mesh.visible = params.surface;
}

//切换是否显示网格线
function changeMeshWireframe() {
	currentParams.wireMesh.visible = params.wireframe;
}

//原模型是否可见
function changeMeshOriginal() {
	currentParams.origMesh.visible = params.original && currentParams.subdivAmount > 0;
}

//默认几何形体加入场景
function createDefaultGeometry() {
	//读取原始的几何模型
	currentParams.originalGeometry = predefinedGeometries[params.geometry];
	//细分器初始化，细分等级默认0初值
	subdivider = new Subdivision(currentParams.originalGeometry);
	currentParams.currentGeometry = subdivider.subdivide(0);
	currentParams.subdivAmount = 0;
	//使用three.js生成初始的几何模型
	currentParams.mesh = new THREE.Mesh(
		currentParams.currentGeometry
	);
	//加载默认材质
	changeMeshMaterial();

	//将形初始几何模型加入到THREE.Scene的场景里
	scene.add(currentParams.mesh);

	//three.js生成网格线并加入
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
	predefinedGeometries[tetrahedron] = new THREE.TetrahedronGeometry(defaultRadius);
	predefinedGeometries[cube] = new THREE.BoxGeometry(defaultRadius, defaultRadius, defaultRadius);
	predefinedGeometries[sphere] = new THREE.SphereGeometry(defaultRadius, 16, 9);
	predefinedGeometries[icosahedron] = new THREE.IcosahedronGeometry(defaultRadius);
	predefinedGeometries[dodecahedron] = new THREE.DodecahedronGeometry(defaultRadius);
	predefinedGeometries[plane] = new THREE.PlaneGeometry(defaultRadius * 2, 2, 2, 2);
	predefinedGeometries[cone] = new THREE.ConeGeometry(defaultRadius, 8, 8);
	predefinedGeometries[torus] = new THREE.TorusGeometry(defaultRadius, 1);
	predefinedGeometries[sphere].mergeVertices();
	predefinedGeometries[torus].mergeVertices();
	// 加载单独的obj文件
	loadAsset(teapot, 'assets/teapot.obj');
	loadAsset(bunny, 'assets/bunny.obj');
}

//创建各种材质
function createMaterials() {
	let commonPhongParams = {
		color: currentParams.meshColor,
		shininess: 40,
		specular: 0x222222
	};
	materials['phongFlat'] = new THREE.MeshPhongMaterial(commonPhongParams);
	materials['phongFlat'].shading = THREE.FlatShading;
	materials['phongSmooth'] = new THREE.MeshPhongMaterial(commonPhongParams);
	materials['phongSmooth'].shading = THREE.SmoothShading;
	materials['lambert'] = new THREE.MeshLambertMaterial({color: currentParams.meshColor});
	materials['normal'] = new THREE.MeshNormalMaterial();
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
	if (!params.autoRotate) {
		currentParams.mesh.rotation.x = 0;
		currentParams.mesh.rotation.y = 0;
		currentParams.wireMesh.rotation.x = 0;
		currentParams.wireMesh.rotation.y = 0;
		currentParams.origMesh.rotation.x = 0;
		currentParams.origMesh.rotation.y = 0;
		startTime = Date.now();
	}
}


//界面初始化
function init() {
	if (!Detector.webgl)
		Detector.addGetWebGLMessage();
	//相机初始化
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, defaultRadius * 10);
	controls = new THREE.OrbitControls(camera);
	controls.addEventListener('change', render);
	//控制器的自定义设置
	controls.enablePan = false;
	controls.minDistance = defaultRadius / 4.0;
	controls.maxDistance = defaultRadius * 4.0;
	controls.zoomSpeed = defaultRadius / 2.0;
	controls.target = new THREE.Vector3(0, 0, 0);
	camera.position.x = defaultRadius * 2.5;

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

	// 初始化渲染器
	renderer = new THREE.WebGLRenderer( {antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor(currentParams.backgroundColor);
	container = document.getElementById('container');
	container.appendChild(renderer.domElement);

	//设置当前信息变化看板的参数
	info = document.createElement('div');
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.style.color = '#ffffff';
	info.innerHTML = '';
	container.appendChild(info);

	//dat.GUI中挂载各类下拉框和拉升条及回调函数，并且在内部执行回调操作为param的对应参数赋用户选择的值
	gui = new dat.GUI();
	gui.add(params, 'geometry', predefinedGeometriesNames).name("几何形体").onChange(changeMeshGeometry);
	//为选择条挂载loop细分操作函数
	paramControllers.subdivAmount = gui.add(params, 'subdivAmount', 0, subdivMax).name("细分等级").step(1).onChange(subdivide);
	gui.add(params, 'material', materialNames).name("材质").onChange(changeMeshMaterial);
	gui.addColor(params, 'meshColor').name('颜色').onChange(changeMeshColor);
	gui.add(params, 'surface').name("展示/隐藏表面").onChange(changeMeshSurface);
	gui.addColor(params, 'wireColor').name('线框颜色').onChange(changeWireMeshColor);
	gui.add(params, 'wireframe').name("展示/隐藏线框").onChange(changeMeshWireframe);
	gui.addColor(params, 'originalColor').name('初始颜色').onChange(changeOriginalColor);
	gui.add(params, 'original').name('展示/隐藏初始').onChange(changeMeshOriginal);
	gui.addColor(params, 'backgroundColor').name('背景色').onChange(changeBackgroundColor);
	gui.add(params, 'autoRotate').name("自动旋转").onChange(changeAutoRotation);

	//创建模型加载器
	objLoader = new THREE.OBJLoader(loadManager);

    //加载各类模型信息
    createPredefinedGeometries();

    //加载各类材质信息
	createMaterials();

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

window.addEventListener('load', init);

function updateScene() {
	if (infoDirty) {
		updateInfo();
		infoDirty = false;
	}
	if (params.autoRotate) {
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
	//按帧对网页进行重绘
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
	//根据场景信息和相机信息进行渲染
	renderer.render( scene, camera );
}
