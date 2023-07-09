
class FaceInfo{
    faceEdges = new Uint32Array(3);
}
//新的顶点对象，e为坐标
class VertexInfo{
    //长度不定
    jointEdges = [];
}
//定义数据结构EMEdge
class EdgeInfo{
    endVertices = new Uint32Array(2);
    oppositeVertices = new Uint32Array(2);
    jointFaces = new Uint32Array(2);
    //获取另点
    getAnotherVertex(vertex){
        return vertex==this.endVertices[0] ? this.endVertices[1] : this.endVertices[0];
    }
}

class SubdivideTools{
    constructor(preVertexArray,preVertexIndexArray) {
        //面集合
        this.faces = [];
        //边集合
        this.edges = [];
        //顶点集合
        this.vertices = [];
        //索引助手
        this.edgeIndexHelper = new Map;
        //初始化
        this.initRelationShip(preVertexArray,preVertexIndexArray);
    }

    initRelationShip(preVertexArray,preVertexIndexArray)
    {
        for(let i = 0;i < preVertexArray.length;i += 3)
        {
            //顶点索引
            this.vertices.push(new VertexInfo());
        }

        for(let i = 0;i < preVertexIndexArray.length;i += 3)
        {
            this.faces.push(new FaceInfo())
            let fIndex = i / 3;
            //注意，此处ei必须要和index里的顺序由小到大对上，否则后续无法计算新增端点处在什么位置
            this.buildRelationShip(preVertexIndexArray[i]  ,preVertexIndexArray[i+1],preVertexIndexArray[i+2],fIndex,0);
            this.buildRelationShip(preVertexIndexArray[i+1],preVertexIndexArray[i+2],preVertexIndexArray[i],  fIndex,1);
            this.buildRelationShip(preVertexIndexArray[i+2],preVertexIndexArray[i],  preVertexIndexArray[i+1],fIndex,2);
        }
    }
    // v0 - 第一个顶点的索引
    // v1 - 第二个顶点的索引
    // vo - 当前面边的对顶点索引
    // fIndex - 第fi个面
    // eIndexLocal - 边的局部索引
    //生成边相关数据的方法
    buildRelationShip(v0,v1,vo,fIndex,eIndexLocal)
    {
        let edgeIndex = -1;
        const MIN_V =  Math.min(v0,v1);
        const MAX_V =  Math.max(v0,v1);
        //判断边是否已经索引
        let edgeName = MIN_V+"_"+MAX_V;
        if(this.edgeIndexHelper.has(edgeName))
        {
            edgeIndex = this.edgeIndexHelper.get(edgeName);
            this.updateEdgeInfoArray(edgeIndex,vo,fIndex);
        }
        else
        {
            edgeIndex = this.edges.length;
            this.edgeIndexHelper.set(edgeName,edgeIndex);
            this.buildEdgeInfoArray(edgeIndex,v0,v1,vo,fIndex);
            this.buildVertexInfoArray(edgeIndex,v0,v1);
        }
        this.faces[fIndex].faceEdges[eIndexLocal] = edgeIndex;
    }
    buildEdgeInfoArray(edgeIndex,v0,v1,vo,fIndex)
    {
        let edgeInfo = new EdgeInfo();
        edgeInfo.endVertices[0] = Math.min(v0,v1);
        edgeInfo.endVertices[1] = Math.max(v0,v1);
        edgeInfo.oppositeVertices[0] = vo;
        edgeInfo.oppositeVertices[1] = vo;
        edgeInfo.jointFaces[0] = fIndex;
        edgeInfo.jointFaces[1] = fIndex;
        this.edges[edgeIndex] = edgeInfo;
    }

    buildVertexInfoArray(edgeIndex,v0,v1)
    {
        this.vertices[v0].jointEdges.push(edgeIndex);
        this.vertices[v1].jointEdges.push(edgeIndex);
    }
    updateEdgeInfoArray(edgeIndex,vo,fIndex)
    {
        this.edges[edgeIndex].oppositeVertices[1] = vo;
        this.edges[edgeIndex].jointFaces[1] = fIndex;
    }
}

//求β需要的计算因子的类
class BetaFactorCache{
    constructor(n)
    {
        //考虑0的情况，多存入一个数据
        this.BetaVlues = new Float32Array(n + 1);
        this.BetaVlues[0] = 0.0;
        this.BetaVlues[1] = 0.0;
        this.BetaVlues[2] = 1.0 / 8.0;
        this.BetaVlues[3] = 3.0 / 16.0;
        for(let i = 4; i <= n;++i)
        {
            this.BetaVlues[i] = (1.0 / i) * ((5.0 / 8.0 ) - Math.pow((3.0 / 8.0 + (1.0 / 4.0) * Math.cos(2.0 * Math.PI / i)),2));
        }
    }
}

//定义细分器 构造函数需要传入一个模型geometry
export class Subdivision{
    constructor(geometry) {
        if(geometry instanceof THREE.Geometry)
        {
            //BufferAttribute 必须要有 index和 position 属性
            this.initialGeometry = new THREE.BufferGeometry();

            let verticesArray = geometry.vertices;
            let positions  = new Float32Array(verticesArray.length*3);
            for(let i = 0;i<verticesArray.length;++i)
            {
                positions[i * 3    ] = verticesArray[i].x;
                positions[i * 3 + 1] = verticesArray[i].y;
                positions[i * 3 + 2] = verticesArray[i].z;
            }

            let facesArray = geometry.faces;
            //二进制的数组，根据定点数量选择Uint8 Uint16 Uint32，注意一定不能使用Int
            let vIndex  = new Uint32Array(facesArray.length*3);
            for(let i = 0;i<facesArray.length;++i)
            {
                vIndex[i * 3    ] = facesArray[i].a;
                vIndex[i * 3 + 1] = facesArray[i].b;
                vIndex[i * 3 + 2] = facesArray[i].c;
            }
            //将顶点坐标数据存入，3个为一组，表示顶点位置
            this.initialGeometry.addAttribute("position",new THREE.BufferAttribute(positions,3));
            //将面的顶点索引数据存入，1个为1组，表示面
            this.initialGeometry.setIndex(new THREE.BufferAttribute(vIndex,1));
            //计算顶点法线
            this.initialGeometry.computeVertexNormals();
        }
        else
        {
            this.initialGeometry = new THREE.BufferGeometry().copy(geometry);
        }

        //计算碰撞边界
        this.initialGeometry.computeBoundingSphere();
        //初始化形体缓存数组
        this.cachedDividedGeometry = [];
        //初始化看板数据vertexCount和faceCount的缓冲数组
        this.info = [{
            //初始顶点数
            vertexCount : this.initialGeometry.getAttribute("position").array.length / 3,
            //初始面片数
            faceCount : this.initialGeometry.getIndex().array.length / 3
        }]
    }
    //析构方法，调用的是BufferGeometry的dispose函数
    dispose() {
        this.initialGeometry.dispose();
        for(let i = 0;i < this.cachedDividedGeometry.length;++i)
        {
            this.cachedDividedGeometry[i].dispose();
        }
    }
    subdivide(num){
        let cacheIndex = num - 1;
        //如果需要的是最初的版本，直接返回
        if(num == 0)
        {
            return this.initialGeometry;
        }
        //判断缓存中是否存在
        else if(this.cachedDividedGeometry[cacheIndex])
        {
            return this.cachedDividedGeometry[cacheIndex];
        }
        //没有现成的则直接生成
        else
        {
            //递归调用,在上一个曲面的基础上细分
            let preGeometry= this.subdivide(num-1);
            let thisGeometry = this.subdivideCore(preGeometry);
            //存入缓存
            this.cachedDividedGeometry[cacheIndex] = thisGeometry;
            //存入看板数据vertexCount和faceCount
            this.info[num] = {
                //初始顶点数
                vertexCount : thisGeometry.getAttribute("position").array.length/3,
                //初始面片数
                faceCount : thisGeometry.getIndex().array.length/3
            }
            return thisGeometry;
        }
    }
    //细分核心方法
    subdivideCore(buffGeom){
        //坐标
        let preVertexArray = buffGeom.getAttribute("position").array;
        //索引
        let preVertexIndexArray = buffGeom.getIndex().array;
        //初始化工具类
        let tools =  new SubdivideTools(preVertexArray,preVertexIndexArray);
        //初始顶点数目
        const oldVTotal = tools.vertices.length;
        //初始边数目
        const oldETotal = tools.edges.length;
        //初始面数目
        const oldFTotal = tools.faces.length;

        //欧拉公式计算细分后的数据
        const Euler = oldVTotal - oldETotal + oldFTotal;
        const newFTotal = oldFTotal * 4;
        const newETotal = oldETotal * 2 + oldFTotal * 3;
        const newVTotal  = newETotal - newFTotal + Euler;

        // 对一个三角形面片细分时，将增加3个面，每个面拥有3条新边，每个边细分为2条新边
        //  o---o---o
        //   \ / \ /
        //    o---o
        //     \ /
        //      o

        //  loop算法
        //  Step 1 - 计算原顶点更新后的坐标
        //遍历的方式寻找顶点中连接边数的最大值，计算各个类型的β值
        let maxECount = -1;
        for(let i = 0;i < oldVTotal ; ++i)
        {
            let temp = tools.vertices[i].jointEdges.length;
            maxECount = maxECount > temp ? maxECount : temp;
        }
        if (2 >= maxECount) {
            throw Error('This is sth wrong');
        }
        //计算β值
        const betaCache = new BetaFactorCache(maxECount);
        // 分配新的顶点数组，存储xyz坐标
        let newPositions = new Float32Array(newVTotal * 3);
        //计算原顶点i对应的新坐标
        for(let i = 0;i < oldVTotal; ++i)
        {
            // 当前顶点的边数
            const n = tools.vertices[i].jointEdges.length;
            // 为顶点数获取适当的值
            const β = betaCache.BetaVlues[n];
            //计算系数
            const factor = 1 - n * β;
            // 根据β值权重进行顶点计算
            let x = preVertexArray[i * 3    ] * factor;
            let y = preVertexArray[i * 3 + 1] * factor;
            let z = preVertexArray[i * 3 + 2] * factor;
            for (let j = 0;j < n ; ++j)
            {
                //加权求和
                const edgeIndex = tools.vertices[i].jointEdges[j];
                const anotherVertex = tools.edges[edgeIndex].getAnotherVertex(i);
                x += β * preVertexArray[anotherVertex * 3    ];
                y += β * preVertexArray[anotherVertex * 3 + 1];
                z += β * preVertexArray[anotherVertex * 3 + 2];
            }
            //更新坐标
            newPositions[i * 3    ] = x;
            newPositions[i * 3 + 1] = y;
            newPositions[i * 3 + 2] = z;
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
        // 一条边对应一个新增顶点，新增顶点的index = 边index + 旧顶点数
        // 新的顶点索引值
        for(let i = 0;i < oldETotal; ++i)
        {
            const v0 = tools.edges[i].endVertices[0];
            const v1 = tools.edges[i].endVertices[1];
            const opv0 = tools.edges[i].oppositeVertices[0];
            const opv1 = tools.edges[i].oppositeVertices[1];
            let x = (3.0 / 8.0) * (preVertexArray[v0 * 3    ] + preVertexArray[v1 * 3    ] )
                + (1.0 / 8.0) * (preVertexArray[opv0 * 3   ] + preVertexArray[opv1 * 3    ]);
            let y = (3.0 / 8.0) * (preVertexArray[v0 * 3 + 1] + preVertexArray[v1 * 3 + 1] )
                + (1.0 / 8.0) * (preVertexArray[opv0 * 3 + 1] + preVertexArray[opv1 * 3 + 1]);
            let z = (3.0 / 8.0) * (preVertexArray[v0 * 3 + 2] + preVertexArray[v1 * 3 + 2] )
                + (1.0 / 8.0) * (preVertexArray[opv0 * 3+ 2] + preVertexArray[opv1 * 3 + 2]);
            const newVIndex = oldVTotal + i;
            newPositions[newVIndex * 3    ] = x;
            newPositions[newVIndex * 3 + 1] = y;
            newPositions[newVIndex * 3 + 2] = z;
        }


        // Step 3 - 对面相关的索引进行计算
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
        //
        // 对每个面进行裂变
        let newIndices = new Uint32Array(newFTotal * 3);
        for(let i = 0;i < oldFTotal; ++i)
        {
            const ov0 = preVertexIndexArray[i * 3    ];
            const ov1 = preVertexIndexArray[i * 3 + 1];
            const ov2 = preVertexIndexArray[i * 3 + 2];

            const nv0 = oldVTotal + tools.faces[i].faceEdges[0];
            const nv1 = oldVTotal + tools.faces[i].faceEdges[1];
            const nv2 = oldVTotal + tools.faces[i].faceEdges[2];

            newIndices[i * 12     ] = ov0;
            newIndices[i * 12 +  1] = nv0;
            newIndices[i * 12 +  2] = nv2;

            newIndices[i * 12 +  3] = nv0;
            newIndices[i * 12 +  4] = ov1;
            newIndices[i * 12 +  5] = nv1;

            newIndices[i * 12 +  6] = nv1;
            newIndices[i * 12 +  7] = ov2;
            newIndices[i * 12 +  8] = nv2;

            newIndices[i * 12 +  9] = nv0;
            newIndices[i * 12 + 10] = nv1;
            newIndices[i * 12 + 11] = nv2;
        }

        let subdivide = new THREE.BufferGeometry();
        //将顶点坐标数据存入，3个为一组，表示顶点位置
        subdivide.addAttribute("position",new THREE.BufferAttribute(newPositions,3));
        //将面的顶点索引数据存入，1个为1组，表示面
        subdivide.setIndex(new THREE.BufferAttribute(newIndices,1));
        //计算碰撞范围
        subdivide.computeBoundingSphere();
        //计算顶点法线
        subdivide.computeVertexNormals();
        return subdivide;
    }
}
