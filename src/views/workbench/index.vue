<template>
  <div class="workbench">
    <!-- ===================== 左：对象树（3/10） ===================== -->
    <aside class="wb-left">
      <div class="wb-panel">
        <div class="wb-panel__header">
          <span class="wb-panel__title">
            <i class="el-icon-s-platform"></i>
            对象树
          </span>
          <div class="wb-panel__actions">
            <el-tooltip content="新建文件夹" placement="bottom" :open-delay="300">
              <el-button type="text" icon="el-icon-folder-add" @click="openFolderDialog('')" />
            </el-tooltip>
            <el-tooltip content="刷新" placement="bottom" :open-delay="300">
              <el-button type="text" icon="el-icon-refresh" @click="loadTree" />
            </el-tooltip>
          </div>
        </div>

        <div class="wb-panel__body">
          <el-tree
            ref="objectTree"
            :data="treeData"
            :props="treeProps"
            node-key="key"
            highlight-current
            default-expand-all
            :expand-on-click-node="false"
            :filter-node-method="filterNode"
            :empty-text="'暂无对象，右键根节点「' + rootLabel + '」新建井号'"
            @node-click="onNodeClick"
            @node-contextmenu="onNodeContextMenu"
          >
            <span slot-scope="{ node, data }" class="wb-node" :class="'wb-node--' + data.type">
                <span class="wb-node__label">
                <i :class="nodeIcon(data)"></i>
                <span class="wb-node__text" :title="node.label">{{ node.label }}</span>
                <span v-if="data.type === 'root' && wellCount" class="wb-node__badge">{{ wellCount }}</span>
                <!-- 地质设计徽标：让用户不点进去就知道这口井有没有上传地质设计。
                     ⚠️ 判据是 data.raw.hasGeological（DOC_TYPE='GEOLOGICAL_DESIGN'），
                        不是 generated —— 那是有没有「生成成果」，两回事。 -->
                <span
                  v-if="data.type === 'well' && data.raw && data.raw.hasGeological"
                  class="wb-node__geo"
                  title="已有压裂地质设计，右键可查看 / 下载"
                >地质</span>
                <!-- 从单井工作台返回时标记刚才那口井，避免在长树里找不到 -->
                <span
                  v-if="data.type === 'well' && data.id && data.id === justOpenedWellId"
                  class="wb-node__from"
                >刚打开</span>
              </span>
            </span>
          </el-tree>
        </div>
      </div>
    </aside>

    <!-- ===================== 右：井号列表（7/10） ===================== -->
    <section class="wb-right">
      <div class="wb-panel wb-panel--fill">
        <div class="wb-panel__header">
          <span class="wb-panel__title">
            <i class="el-icon-s-data"></i>
            {{ currentNodeTitle }}
          </span>
          <div class="wb-panel__actions">
            <el-input
              v-model="keyword"
              class="wb-search"
              size="small"
              placeholder="搜索井号 / 井名"
              prefix-icon="el-icon-search"
              clearable
            />
            <el-button type="primary" size="small" icon="el-icon-plus" @click="openWellDialog()">
              新建井号
            </el-button>
          </div>
        </div>

        <div class="wb-panel__body wb-panel__body--table">
          <el-table
            ref="wellTable"
            :data="pagedWellRows"
            v-loading="loading"
            height="100%"
            size="small"
            border
            empty-text="暂无井号，点击右上角「新建井号」或在左侧对象树右键新建"
          >
            <el-table-column type="index" label="#" width="52" align="center" />
            <el-table-column label="井号" min-width="150">
              <template slot-scope="{ row }">
                <a class="wb-well-link" @click="openWell(row)">{{ row.name }}</a>
              </template>
            </el-table-column>
            <el-table-column label="区块" min-width="130" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.block || blockLabel(row.blockCodeId) }}
              </template>
            </el-table-column>
            <el-table-column prop="perforationMethod" label="射孔方式" width="120" />
            <el-table-column prop="wellType" label="井型" width="100" />
            <!-- ============ 状态列 ============
                 判据来自后端 data.wells[].generated（COMM_WB_WELL_DOC 里是否已有
                 DOC_TYPE='GENERATED_REPORT' AND DOC_SOURCE='GENERATED' 的记录），
                 ⚠️ 不要退回用 row.status：那是建井时写死的「待生成」，永不更新。

                 2026-11-15：未生成的那一档不再显示「未生成」四个字，改为**资料收集百分比**。
                 原因：「未生成」是一句判词，用户看完不知道该干什么；「资料已收集 25%」
                 直接告诉他这口井还差材料，点进单井工作台补完就能生成。
                 分母只算必需项（地质设计 + MSE + 套管接箍 + 全烃值），算法与单井工作台
                 共用 wellModules.js 的 collectProgress，两处数字必须一致。 -->
            <el-table-column label="状态" width="132" align="center">
              <template slot-scope="{ row }">
                <el-tooltip
                  v-if="row.generated"
                  placement="top"
                  effect="dark"
                  :content="generatedTip(row)"
                >
                  <span class="wb-status wb-status--done">
                    <i class="el-icon-circle-check"></i>
                    已生成 v{{ row.latestVersion }}
                    <em v-if="row.versionCount > 1">×{{ row.versionCount }}</em>
                  </span>
                </el-tooltip>
                <el-tooltip
                  v-else
                  placement="top"
                  effect="dark"
                >
                  <!-- 多行说明必须用 slot：`:content` 里的 \n 不换行，会挤成一条横贯屏幕 -->
                  <div slot="content" class="wb-progress-tip">{{ progressTip(row) }}</div>
                  <span class="wb-status wb-status--progress" :class="progressClass(row)">
                    <span class="wb-progress">
                      <i class="wb-progress__bar" :style="{ width: progressOf(row) + '%' }"></i>
                    </span>
                    <span class="wb-progress__num">{{ progressOf(row) }}%</span>
                  </span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="source" label="来源" width="90" />
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <!-- 操作列：进入 / 工程设计 / 编辑 / 删除。
                 「射孔方案」已从此处移除（入口保留在右键菜单与单井工作台模块卡片）。
                 「提取」已从此处移除（2026-11-10，入口保留在右键菜单「智能提取（带入井号）」
                 与单井工作台头部的「进入智能提取」，避免与「进入」入口混淆）。
                 「工程设计」（2026-11-10 由「地质设计」改）：展示的是**系统生成的成果**
                 （DOC_SOURCE='GENERATED'），可预览/下载；历史版本仍在弹窗里。
                 输入资料（地质设计）改由右键菜单查看，两者口径不同不能混。 -->
            <el-table-column label="操作" width="268" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="mini" @click="openWell(row)">进入</el-button>
                <el-button
                  type="text"
                  size="mini"
                  :class="{ 'wb-op--muted': !row.generated }"
                  @click="openDesignDoc(row)"
                >工程设计</el-button>
                <el-button type="text" size="mini" @click="openWellDialog(row)">编辑</el-button>
                <el-button type="text" size="mini" class="wb-danger" @click="removeWell(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="wb-panel__footer">
          <span class="wb-total">共 {{ filteredWellRows.length }} 个井号</span>
          <el-pagination
            background
            small
            layout="prev, pager, next, sizes"
            :current-page.sync="page"
            :page-size.sync="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredWellRows.length"
          />
        </div>
      </div>
    </section>

    <!-- ===================== 文档弹窗（工程设计成果 / 地质设计） ===================== -->
    <!--
      单独做一个弹窗而不是跳单井工作台，是因为用户要的是「在列表上直接看/存」，
      跳页面会丢掉当前列表的筛选和翻页位置（常见诉求是逐口井过一遍资料）。

      ⚠️ 两种口径共用一个弹窗，靠 geoDialog.docType 切换，绝不能混成一个列表：
        docType='GENERATED_REPORT' + docSource='GENERATED'
            → **工程设计成果**（系统生成，只读，无「上传入库」按钮）
        docType='GEOLOGICAL_DESIGN'
            → **地质设计资料**（用户上传的输入，可上传入库）
      「已生成成果」的判据必须与后端 latestGeneratedByWell 一致（DOC_SOURCE='GENERATED'），
      只按 docType 过滤会把手工导出的散图（DOC_SOURCE='MANUAL'）当成设计成果列出来。
    -->
    <el-dialog
      :title="geoDialogTitle"
      :visible.sync="geoDialog.visible"
      width="760px"
      append-to-body
      :close-on-click-modal="false"
    >
      <div class="wb-geo__bar">
        <span class="wb-geo__hint">{{ geoDialogHint }}</span>
        <div class="wb-geo__bar-actions">
          <el-button
            size="mini"
            icon="el-icon-refresh"
            :loading="geoDialog.loading"
            @click="loadGeoDocs"
          >刷新</el-button>
          <!-- 成果由系统生成，不提供上传入库：人工上传会污染版本链，
               也会让「已生成 vX」与文件实际来源对不上 -->
          <template v-if="!isGeneratedMode">
            <el-button
              size="mini"
              type="primary"
              icon="el-icon-upload2"
              :loading="geoDialog.uploading"
              @click="pickGeoFile"
            >上传入库</el-button>
            <!-- 原生 input：上传入库不弹第二个对话框，选完文件直接传 -->
            <input
              ref="geoFile"
              type="file"
              class="wb-geo__file"
              accept=".doc,.docx,.pdf"
              @change="onGeoFilePicked"
            />
          </template>
        </div>
      </div>

      <el-table
        v-loading="geoDialog.loading"
        :data="geoDialog.docs"
        size="mini"
        border
        max-height="360"
        :row-class-name="geoRowClass"
        :empty-text="geoDialogEmptyText"
      >
        <el-table-column prop="fileName" label="文件名" min-width="230" show-overflow-tooltip>
          <template slot-scope="{ row }">
            <i class="el-icon-document wb-geo__icon"></i>
            <span>{{ row.fileName }}</span>
            <!-- 备注里记的是「从知识库提取」「手工上传」这类来源说明，
                 同一份文件反复入库时文件名完全一样，只有这里能区分 -->
            <div v-if="row.remark" class="wb-geo__remark" :title="row.remark">{{ row.remark }}</div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="86" align="center">
          <template slot-scope="{ row }">{{ fmtSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="版本" width="96" align="center">
          <template slot-scope="{ row }">
            <span class="wb-nowrap" :class="{ 'wb-geo__ver--old': row.isCurrent !== '1' }">
              v{{ row.versionTag || ('1.0.' + ((row.versionNo || 1) - 1)) }}
            </span>
            <el-tag v-if="row.isCurrent === '1'" size="mini" type="success" effect="plain">当前</el-tag>
            <el-tag v-else size="mini" type="info" effect="plain">历史</el-tag>
          </template>
        </el-table-column>
        <!-- 成果列表显示「生成时间」，资料列表显示「上传时间」：
             两者语义不同，用同一列名会让用户以为成果是手工传上去的 -->
        <el-table-column
          prop="createDate"
          :label="isGeneratedMode ? '生成时间' : '上传时间'"
          width="150"
          align="center"
        />
        <el-table-column label="操作" width="130" align="right">
          <template slot-scope="{ row }">
            <div class="wb-geo__ops">
              <el-button type="text" size="mini" @click="viewGeoDoc(row)">预览</el-button>
              <el-button type="text" size="mini" @click="downloadGeoDoc(row)">下载</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer">
        <!-- 明确告知：列表含全部历史版本，不是只有当前版。
             「n 个版本」与「当前 vX」分开写，避免用户把「共 n 份」误读成「n 份不同文件」 -->
        <span class="wb-geo__foot-tip">
          共 {{ geoDialog.docs.length }} {{ geoDialog.docs.length > 1 ? '个版本' : '份文档' }}<template
            v-if="geoCurrentTag"
          >，当前使用 v{{ geoCurrentTag }}</template>
        </span>
        <el-button size="small" @click="geoDialog.visible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- ===================== 地质设计 预览抽屉 ===================== -->
    <el-drawer
      :visible.sync="geoPreview.visible"
      size="70%"
      :title="geoPreview.title"
      append-to-body
      @closed="clearGeoPreview"
    >
      <div v-loading="geoPreview.loading" class="wb-geo__preview">
        <div v-if="geoPreview.kind === 'docx'" ref="geoDocxBox" class="wb-geo__preview-docx"></div>
        <iframe
          v-else-if="geoPreview.kind === 'iframe'"
          :src="geoPreview.url"
          class="wb-geo__preview-frame"
          frameborder="0"
        />
        <el-empty
          v-else-if="geoPreview.kind === 'none' && !geoPreview.loading"
          :image-size="80"
          description="该格式暂不支持在线查看，请下载后打开"
        />
      </div>
    </el-drawer>

    <!-- ===================== 右键菜单 ===================== -->
    <ul
      v-show="contextMenu.visible"
      ref="contextMenu"
      class="wb-context-menu"
      :style="{ left: contextMenu.left + 'px', top: contextMenu.top + 'px' }"
    >
      <li v-if="contextMenu.nodeType === 'root' || contextMenu.nodeType === 'folder'" @click="menuCreateWell">
        <i class="el-icon-plus"></i> 建井号
      </li>
      <li v-if="contextMenu.nodeType === 'folder'" @click="menuCreateFolder">
        <i class="el-icon-folder-add"></i> 新建子文件夹
      </li>
      <li v-if="contextMenu.nodeType === 'root'" @click="menuCreateFolder">
        <i class="el-icon-folder-add"></i> 新建文件夹
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuOpenWell">
        <i class="el-icon-s-data"></i> 进入单井工作台
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuGeologicalWell">
        <i class="el-icon-document"></i> 地质设计（查看 / 下载 / 入库）
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuDesignDoc">
        <i class="el-icon-tickets"></i> 工程设计成果（预览 / 下载）
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuExtractWell">
        <i class="el-icon-magic-stick"></i> 智能提取（带入井号）
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuPerforationWell">
        <i class="el-icon-s-grid"></i> 射孔方案
      </li>
      <li v-if="contextMenu.nodeType === 'well'" @click="menuEditWell">
        <i class="el-icon-edit-outline"></i> 编辑井号
      </li>
      <li v-if="contextMenu.nodeType === 'well'" class="wb-context-menu__danger" @click="menuRemoveWell">
        <i class="el-icon-delete"></i> 删除井号
      </li>
      <li v-if="contextMenu.nodeType === 'folder'" divided @click="menuRenameFolder">
        <i class="el-icon-edit"></i> 重命名
      </li>
      <li v-if="contextMenu.nodeType === 'folder'" class="wb-context-menu__danger" @click="menuRemoveFolder">
        <i class="el-icon-delete"></i> 删除文件夹
      </li>
      <li v-if="contextMenu.nodeType === 'root'" divided @click="menuReload">
        <i class="el-icon-refresh"></i> 刷新
      </li>
    </ul>

    <!-- ===================== 建井号 弹窗 ===================== -->
    <el-dialog
      :title="wellForm.id ? '编辑井号' : '建井号'"
      :visible.sync="wellDialogVisible"
      width="560px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onWellDialogClosed"
    >
      <el-form ref="wellForm" :model="wellForm" :rules="wellRules" label-width="90px" size="small">
        <el-form-item label="井号" prop="name">
          <!-- 输入井名 → 自动到主数据 CD_WELL 模糊匹配，下拉可选，避免井号录错 -->
          <el-autocomplete
            v-model="wellForm.name"
            :fetch-suggestions="queryWellSuggestions"
            :trigger-on-focus="false"
            :debounce="300"
            placeholder="请输入井名，如 郑58-5B-3平2（自动匹配井库）"
            clearable
            style="width: 100%"
            popper-class="wb-well-suggest"
            :popper-append-to-body="false"
            @input="onWellNameInput"
            @select="onWellSuggestionSelect"
            @keyup.enter.native="onWellInputEnter"
          >
            <template slot-scope="{ item }">
              <div class="wb-suggest-item">
                <span class="wb-suggest-item__name">{{ item.wellName }}</span>
                <span v-if="item.wellType || item.wellPurpose" class="wb-suggest-item__tag">
                  {{ [item.wellType, item.wellPurpose].filter(Boolean).join(' / ') }}
                </span>
                <span v-if="item.block" class="wb-suggest-item__block">{{ item.block }}</span>
              </div>
            </template>
            <i
              v-if="wellSuggestLoading"
              slot="suffix"
              class="el-input__icon el-icon-loading"
            />
          </el-autocomplete>
          <div class="wb-form-tip">
            <i class="el-icon-search"></i>
            输入 1 个字以上自动从井库（CD_WELL）匹配井号，点击候选项即可带入井号、井型、区块，避免写错。
            <span v-if="wellLibraryMatched" class="wb-form-tip__hit">
              <i class="el-icon-success"></i> 井库已匹配（{{ wellLibraryMatched.wellId }}）
            </span>
            <span
              v-else-if="wellForm.name && wellForm.name.length >= 3 && !wellSuggestLoading"
              class="wb-form-tip__miss"
            >
              <i class="el-icon-warning-outline"></i> 井库未匹配到，将按手工创建保存（建议从候选里选，否则井型/区块需手填）
            </span>
          </div>
        </el-form-item>

        <el-form-item label="所属文件夹">
          <el-select v-model="wellForm.folderId" placeholder="未分组（根节点）" style="width: 100%" clearable>
            <el-option label="未分组（根节点）" value="" />
            <el-option
              v-for="f in folderOptions"
              :key="f.id"
              :label="f.path"
              :value="f.id"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="区块">
              <el-select
                v-model="wellForm.blockCodeId"
                placeholder="请选择区块"
                filterable
                clearable
                style="width: 100%"
                :loading="blockLoading"
                @focus="loadBlockOptions"
                @change="onBlockChange"
              >
                <el-option
                  v-for="opt in blockOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="射孔方式">
              <el-select v-model="wellForm.perforationMethod" placeholder="请选择射孔方式" clearable style="width: 100%">
                <el-option
                  v-for="opt in perforationMethodOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="井型">
              <el-input v-model="wellForm.wellType" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="wellForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button size="small" @click="wellDialogVisible = false">取 消</el-button>
        <el-button size="small" type="primary" :loading="submitting" @click="submitWell">
          {{ wellForm.id ? '保 存' : '创 建' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
/**
 * 工作台 - 左侧对象树 / 右侧井号列表（3 : 7）
 *
 * 交互约定：
 *  - 左侧对象树「右键」→ 建井号 / 新建文件夹 / 重命名 / 删除
 *  - 点击右侧列表中的井号（或右键井节点→进入）→ 进入单井工作台
 *  - 井基础信息来自后端 /v1/wells（可用于校验井号是否真实存在），
 *    树的层级与井号归属保存在浏览器本地。
 *  - 建井号时输入井名会走 /v1/wells/suggest 到主数据 CD_WELL 模糊匹配，
 *    下拉选中即回填井号 / 井型 / 区块。
 */
import { getWellList, suggestWellNames as fetchWellSuggest } from '@/api/workbench'
import {
  // 别名导入：组件内已有同名方法 loadTree()，直接用具名会自我递归
  loadTree as fetchTree,
  createFolder as storeCreateFolder,
  renameFolder as storeRenameFolder,
  removeFolder as storeRemoveFolder,
  createWell as storeCreateWell,
  updateWell as storeUpdateWell,
  removeWell as storeRemoveWell,
  isLocalMode
} from './treeStore'
import { getBlockOptions, getAttachments } from '@/api/workbench'
// 地质设计查看 / 下载 / 入库（复用单井工作台同一套接口，避免两处实现各自跑偏）
import {
  listWellDocs,
  uploadWellDoc,
  downloadWellDoc,
  previewWellDoc
} from '@/api/wellDoc'
// 资料收集进度的分母与算法（与单井工作台共用，两处数字必须一致）
import { MODULES, collectProgress } from './wellModules'

const ROOT_ID = '__root__'

export default {
  name: 'Workbench',
  data() {
    return {
      treeProps: { children: 'children', label: 'label' },
      // 当前用户标识（系统未接入真实登录，统一 default）
      userId: 'default',
      folders: [],
      wells: [],
      loading: false,
      localTipShown: false,
      keyword: '',
      page: 1,
      pageSize: 10,
      currentNode: { key: ROOT_ID, type: 'root', label: '工作台', id: '' },
      // 一次性：loadTree() 结束后把树的选中拉到这口井，用完即清（避免抢用户后续的点击）
      highlightWellId: '',
      // 持久：树上给这口井打「刚打开」绿标，用户点了别的节点才清
      justOpenedWellId: '',

      /**
       * 资料收集进度缓存：{ [wbWellId]: { percent, got, need } }
       *
       * <p>为什么不塞进 row：row 来自 treeStore 的白名单映射（mapWell），
       * 往里加字段要在那层也加一遍，且附件是「列出来之后再补查」的，
       * 混进 row 会让 loadTree 的返回值看起来像带了附件信息，容易误用。
       *
       * <p>只给**未生成**的井查：已生成的那一档显示版本号，百分比对它没意义，
       * 查了也白查（10 口井就是 10 个请求）。
       */
      progressMap: {},
      /** 进度查过一次就记住，翻页/筛选不重复请求 */
      progressLoadedFor: '',
      progressLoading: false,

      // 右键菜单
      contextMenu: {
        visible: false,
        left: 0,
        top: 0,
        nodeType: 'root',
        key: ROOT_ID
      },

      /* ---------------- 文档弹窗（工程设计成果 / 地质设计 共用） ----------------
       * docType 决定口径：
       *   'GENERATED_REPORT'  → 系统生成的**工程设计成果**（只读，无上传）
       *   'GEOLOGICAL_DESIGN' → 用户上传的**地质设计资料**（可上传入库）
       * 两者绝不能混列，详见模板处注释。 */
      geoDialog: {
        visible: false,
        loading: false,
        uploading: false,
        wbWellId: '',
        wellName: '',
        /** 当前模式：默认进成果模式（列表入口是「工程设计」） */
        docType: 'GENERATED_REPORT',
        docs: []
      },
      /* ---------------- 地质设计预览抽屉 ---------------- */
      geoPreview: {
        visible: false,
        loading: false,
        kind: 'none',
        url: '',
        title: ''
      },

      // 建井号表单
      wellDialogVisible: false,
      submitting: false,
      // 井库（CD_WELL）联想
      wellSuggestLoading: false,
      wellLibraryMatched: null,
      // 联想请求序号，用于丢弃过期响应
      wellSuggestSeq: 0,
      wellForm: {
        id: '', name: '', folderId: '',
        block: '', blockCodeId: '',
        perforationMethod: '',
        wellType: '', remark: ''
      },
      // 下拉选项
      blockOptions: [],
      perforationMethodOptions: [
        { label: '全程固井', value: '全程固井' },
        { label: '半程固井', value: '半程固井' },
        { label: '滑套压裂', value: '滑套压裂' }
      ],
      blockLoading: false,
      wellRules: {
        name: [
          { required: true, message: '请输入井号', trigger: 'blur' },
          { min: 1, max: 60, message: '井号长度不超过 60 个字符', trigger: 'blur' },
          { validator: this.validateWellNameUnique, trigger: 'blur' }
        ]
      }
    }
  },

  computed: {
    rootLabel() {
      return '工作台'
    },

    /**
     * 当前生效的地质设计版本号（如 1.0.1）。
     *
     * <p>弹窗页脚用它明确写出「当前使用 vX」：一屏全是 1.0.x 时，
     * 光看每行的绿色「当前」标签容易串行，页脚再点一次更稳。
     * 后端保证同一井同一类型只有一条 IS_CURRENT='1'，这里按非空取第一条即可。
     */
    geoCurrentTag() {
      const cur = (this.geoDialog.docs || []).find(d => d.isCurrent === '1')
      if (!cur) return ''
      return cur.versionTag || ('1.0.' + ((cur.versionNo || 1) - 1))
    },

    /** 当前是否「工程设计成果」模式（只读，不提供上传入库） */
    isGeneratedMode() {
      return this.geoDialog.docType === 'GENERATED_REPORT'
    },

    /** 弹窗标题：两种模式措辞不同，避免用户把「资料」当成「成果」 */
    geoDialogTitle() {
      const name = this.geoDialog.wellName
      const base = this.isGeneratedMode ? '压裂工程设计成果' : '压裂地质设计'
      return name ? (base + ' — ' + name) : base
    },

    /** 弹窗顶部说明 */
    geoDialogHint() {
      if (this.isGeneratedMode) {
        return '该井系统生成的压裂工程设计成果，可在线预览或下载；历史版本一并列出。'
      }
      return '该井已上传的地质设计文档。可直接查看或下载；若还没有，可在此上传入库。'
    },

    /** 空态文案：成果为空要说清「去生成」而不是「去上传」 */
    geoDialogEmptyText() {
      if (this.isGeneratedMode) {
        return '该井还没有生成过压裂工程设计，可进入单井工作台或压裂智能体生成'
      }
      return '该井还没有压裂地质设计，点击右上角「上传入库」'
    },

    wellCount() {
      return this.wells.length
    },

    /** 构建 el-tree 数据：根 → 文件夹（可嵌套）→ 井号 */
    treeData() {
      const build = (parentId) => {
        const children = []
        // 文件夹
        this.folders
          .filter(f => (f.parentId || '') === parentId)
          .forEach(f => {
            const sub = build(f.id)
            const wellNodes = this.wells
              .filter(w => (w.folderId || '') === f.id)
              .map(w => ({
                type: 'well',
                key: w.id,
                id: w.id,
                label: w.name,
                raw: w,
                children: []
              }))
            children.push({
              type: 'folder',
              key: f.id,
              id: f.id,
              label: f.name,
              children: wellNodes.concat(sub)
            })
          })
        // 归属根节点的井号
        if (parentId === '') {
          this.wells
            .filter(w => !w.folderId)
            .forEach(w => {
              children.push({
                type: 'well',
                key: w.id,
                id: w.id,
                label: w.name,
                raw: w,
                children: []
              })
            })
        }
        return children
      }

      return [{
        type: 'root',
        key: ROOT_ID,
        id: '',
        label: this.rootLabel,
        children: build('')
      }]
    },

    /** 当前选中节点下的井号（根 / 文件夹） */
    scopedWellRows() {
      const node = this.currentNode
      let list = this.wells
      if (node.type === 'folder') {
        const ids = this.collectFolderIds(node.id)
        list = this.wells.filter(w => ids.includes(w.folderId || ''))
      }
      return list
        .slice()
        .sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
    },

    /** 叠加关键词过滤 */
    filteredWellRows() {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.scopedWellRows
      return this.scopedWellRows.filter(w =>
        String(w.name || '').toLowerCase().includes(kw) ||
        String(w.block || '').toLowerCase().includes(kw)
      )
    },

    pagedWellRows() {
      const start = (this.page - 1) * this.pageSize
      return this.filteredWellRows.slice(start, start + this.pageSize)
    },

    currentNodeTitle() {
      const node = this.currentNode
      if (node.type === 'folder') return node.label
      return '井号列表'
    },

    /** 文件夹下拉（带层级路径） */
    folderOptions() {
      const build = (parentId, prefix) => {
        let out = []
        this.folders
          .filter(f => (f.parentId || '') === parentId)
          .forEach(f => {
            out.push({ id: f.id, path: prefix + f.name })
            out = out.concat(build(f.id, prefix + f.name + ' / '))
          })
        return out
      }
      return build('', '')
    }
  },

  watch: {
    keyword() {
      // 关键词变化后回到第一页
      this.page = 1
      if (this.$refs.objectTree) {
        this.$refs.objectTree.filter(this.keyword)
      }
    },
    filteredWellRows(len) {
      const maxPage = Math.max(1, Math.ceil(len / this.pageSize))
      if (this.page > maxPage) this.page = maxPage
    }
  },

  created() {
    this.bindGlobalClick()
    this.loadTree()
    this.loadDropdownOptions()
  },

  beforeDestroy() {
    document.removeEventListener('click', this.hideContextMenu)
    window.removeEventListener('resize', this.hideContextMenu)
    // 离开页面时回收预览用过的 blob url，否则 PDF/图片会一直占着内存
    this.clearGeoObjectUrl()
  },

  methods: {
    /* ------------------------- 数据加载 ------------------------- */

    /** 从后端加载对象树（后端不可用时自动退回本地存储） */
    async loadTree() {
      this.loading = true
      try {
        const tree = await fetchTree({ userId: this.userId })
        this.folders = tree.folders
        this.wells = tree.wells
        // 树变了（新建/删除井、重新进入页面）→ 进度缓存必须作废重查，
        // 否则新井永远没有百分比、删掉的井进度还留着
        this.progressLoadedFor = ''
        this.loadCollectProgress()
        // 从单井工作台「返回对象树」时，query 带 wbWellId → 自动定位到该井所在井组
        this.locateWellFromQuery()
        if (tree.local && !this.localTipShown) {
          this.localTipShown = true
          this.$message({
            type: 'warning',
            message: '对象树接口暂不可用，已切换为本地存储模式',
            duration: 3500
          })
        }
      } finally {
        this.loading = false
        // ⚠️ 树的选中必须只在这一处设置。
        //    以前 locateWellFromQuery() 内部也 setCurrentKey，两处 $nextTick 按
        //    入队顺序执行，finally 的排在后 → 反而把井节点的选中覆盖成根节点。
        //    现在 locate 只负责「定标记」，这里统一消费。
        const targetKey = this.highlightWellId || this.currentNode.key || ROOT_ID
        this.highlightWellId = ''
        this.$nextTick(() => {
          if (this.$refs.objectTree) {
            this.$refs.objectTree.setCurrentKey(targetKey)
          }
        })
      }
    },

    /**
     * 从单井工作台「返回对象树」时定位。
     *
     * ⚠️ 2026-11-05 修正：以前直接把 currentNode 设成「该井所在井组」，
     * 结果右侧列表被 scopedWellRows 过滤成只剩这一个井组，
     * 用户感觉「返回后数据不见了」。
     * 现在改为：
     *   1) currentNode 回到根节点 → 右侧仍展示全部井号（返回=恢复原状，不是钻进某个文件夹）
     *   2) 树选中该井 + 打「刚打开」绿标 → 依然能一眼看到刚才那口井
     *
     * 两个字段分工（别合并，合并会互相踩）：
     *   highlightWellId —— 一次性，「把树选中拉到这口井」，由 loadTree() finally 消费后清空
     *   justOpenedWellId —— 持久，「树上打『刚打开』绿标」，直到用户点别的节点才清
     * 如果只用一个字段，用户点任意文件夹触发的 loadTree() 都会把选中抢回那口井。
     *
     * ⚠️ 本方法只设标记，不碰树（不调 setCurrentKey / 不 nextTick 操作 node）。
     *    树的选中统一由 loadTree() 的 finally 设置，否则两处 $nextTick 互相覆盖。
     */
    locateWellFromQuery() {
      const wbWellId = (this.$route.query || {}).wbWellId
      if (!wbWellId) return
      const well = (this.wells || []).find(w => w.id === wbWellId)
      if (!well) return

      // 1) 视图回到根：右侧列表展示全部井号
      this.currentNode = { key: ROOT_ID, type: 'root', label: this.rootLabel, id: '' }
      this.page = 1

      // 2) 树上的「刚打开」绿标（持久，等用户点别的节点才清）
      this.justOpenedWellId = well.id

      // 3) 一次性：让 loadTree() 的 finally 把树选中拉到这口井
      this.highlightWellId = well.id

      // 4) 展开所在井组并滚到可见位置（用 $nextTick 是安全的：
      //    只改 node.expanded / scrollIntoView，不影响「选中」这个唯一状态）
      const folder = well.folderId ? (this.folders || []).find(f => f.id === well.folderId) : null
      if (!folder) return
      this.$nextTick(() => {
        const tree = this.$refs.objectTree
        if (!tree) return
        // 逐级展开祖先文件夹（当前只支持一级，但保留递归以防以后嵌套）
        let cur = folder
        const chain = []
        while (cur) {
          chain.unshift(cur)
          cur = cur.parentId ? (this.folders || []).find(f => f.id === cur.parentId) : null
        }
        chain.forEach(f => {
          const node = tree.getNode(f.id)
          if (node && !node.expanded) node.expanded = true
        })
        const wellNode = tree.getNode(well.id)
        if (wellNode) {
          const parent = wellNode.parent
          if (parent) parent.expanded = true
          const el = wellNode.$el
          if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
        }
      })
    },

    /** 加载区块下拉选项（射孔方式为静态选项，无需加载） */
    async loadDropdownOptions() {
      try {
        const res = await getBlockOptions({})
        this.blockOptions = (res && res.data) || []
      } catch (e) {
        console.warn('[workbench] 加载区块选项失败', e)
      }
    },

    /** 根据 blockCodeId 查找展示名 */
    blockLabel(codeId) {
      if (!codeId) return ''
      const found = this.blockOptions.find(o => o.value === codeId)
      return found ? found.label : ''
    },

    /**
     * 状态列「已生成」的悬停提示：文件名 / 生成时间 / 历史版本数。
     *
     * 列表里只放得下「已生成 v1.0.2」，但用户真正想知道的是
     * 「生成的是哪份文件、什么时候生成的、以前那几个版本还在不在」，
     * 这些塞进 tooltip 比再加三列更合适。
     */
    generatedTip(row) {
      const lines = []
      if (row.latestFileName) lines.push('文件：' + row.latestFileName)
      if (row.latestGeneratedAt) lines.push('生成时间：' + row.latestGeneratedAt)
      if (row.versionCount > 1) {
        lines.push('共 ' + row.versionCount + ' 个版本（旧版本可在单井工作台查看）')
      }
      return lines.join('　|　') || '已生成'
    },

    /* ------------------- 资料收集进度（未生成井的状态列） ------------------- */

    /**
     * 批量查未生成井的资料收集进度。
     *
     * <p><b>为什么要逐井查附件</b>：tree 接口只回 `hasGeological` / `geologicalCount`，
     * 不含附件（MSE / 套管接箍 / 全烃值），而这三项恰恰是分母的大头。
     * 一口井一个 `GET /v1/workbench/attachments/{wbWellId}`，并发发出，
     * 单井失败只把该井算成 0%，不能让整张列表卡住或全部空白。
     *
     * <p><b>只查未生成的井</b>：已生成的那一档显示版本号，百分比对它无意义。
     *
     * <p><b>为什么进度是「附加上去的」而不是 loadTree 的一部分</b>：
     * 列表本身要快（用户切文件夹时首屏感知明显），进度晚一两秒到不影响阅读；
     * 反过来把附件查询串进 loadTree，10 口井就要多等一轮往返。
     */
    async loadCollectProgress() {
      const list = (this.wells || []).filter(w => !w.generated && w.id)
      if (!list.length) {
        this.progressMap = {}
        this.progressLoadedFor = this.progressKey()
        return
      }
      // 同一批井已经查过就不再查（分页、筛选、切根节点都会反复调到这里）
      if (this.progressLoadedFor === this.progressKey()) return

      this.progressLoading = true
      this.progressLoadedFor = this.progressKey()
      const map = {}
      await Promise.all(list.map(async w => {
        let types = []
        try {
          const res = await getAttachments(w.id)
          types = ((res && res.data) || []).map(a => a.attachmentType).filter(Boolean)
        } catch (e) {
          // 单井失败按「没有附件」处理：百分比偏低会让用户去补材料，
          // 比整列空着更安全；真正的接口故障在工作台的附件列表里能看到
          types = []
        }
        map[w.id] = collectProgress({
          attachmentTypes: types,
          geoDocCount: w.geologicalCount || 0
        })
      }))
      this.progressMap = map
      this.progressLoading = false
    },

    /** 这批未生成井的指纹，用于判断缓存是否还能用 */
    progressKey() {
      return (this.wells || [])
        .filter(w => !w.generated && w.id)
        .map(w => w.id)
        .sort()
        .join(',')
    },

    /** 某口井的资料收集百分比（拿不到时给 0，不显示成「-」） */
    progressOf(row) {
      const p = this.progressMap[row.id]
      return p ? p.percent : 0
    },

    /** 进度条的三种配色态：齐了绿、一份没有灰、其余蓝 */
    progressClass(row) {
      const p = this.progressMap[row.id]
      if (!p) return ''
      if (p.need > 0 && p.got >= p.need) return 'is-full'
      if (p.got === 0) return 'is-zero'
      return ''
    },

    /**
     * 未生成井的悬停提示：差哪几份、去哪补。
     *
     * <p>只报「还差什么」不报「已有什么」—— 用户真正要动的是缺的那几项，
     * 把已有的也列出来只会让提示变长、还得自己比对。
     */
    progressTip(row) {
      const p = this.progressMap[row.id]
      if (!p) return '资料收集进度读取中…'
      const lines = [`资料已收集 ${p.percent}%（必需材料 ${p.got}/${p.need}）`]
      if (p.lack && p.lack.length) {
        lines.push('还差：' + p.lack.join('、'))
      } else {
        lines.push('必需材料已齐，可直接生成')
      }
      lines.push('点「进入」到单井工作台补齐后再生成')
      return lines.join('\n')
    },

    /** 区块下拉获焦时懒加载 */
    async loadBlockOptions() {
      if (this.blockOptions.length > 0) return
      this.blockLoading = true
      try {
        const res = await getBlockOptions({})
        this.blockOptions = (res && res.data) || []
      } catch (e) {
        console.warn('[workbench] 加载区块选项失败', e)
      } finally {
        this.blockLoading = false
      }
    },

    /** 区块选中后同步 block 文本值 */
    onBlockChange(codeId) {
      if (!codeId) {
        this.wellForm.block = ''
        return
      }
      const found = this.blockOptions.find(o => o.value === codeId)
      this.wellForm.block = found ? found.label : ''
    },

    /** 收集某个文件夹以及其所有子文件夹的 id */
    collectFolderIds(folderId) {
      const ids = [folderId]
      let frontier = [folderId]
      while (frontier.length) {
        const next = []
        this.folders.forEach(f => {
          if (frontier.includes(f.parentId || '')) {
            ids.push(f.id)
            next.push(f.id)
          }
        })
        frontier = next
      }
      return ids
    },

    /** 井库模糊搜索（用于校验井号是否真实存在） */
    async searchWellLibrary(name) {
      const kw = String(name || '').trim()
      if (kw.length < 2) return []
      try {
        const res = await getWellList({ keyword: kw, page: 1, pageSize: 50 })
        const data = (res && res.data) || {}
        const list = Array.isArray(data) ? data : (data.list || [])
        return list.map(item => ({
          name: item.wellName,
          block: item.block || '',
          wellType: item.wellType || item.wellSort || '',
          realWellId: item.wellId
        }))
      } catch (e) {
        // 井库不可用时不影响本地新建
        return []
      }
    },

    /* ------------------------- 井库（CD_WELL）联想 ------------------------- */

    /**
     * el-autocomplete 的数据源：输入井名 → 主数据 CD_WELL 模糊匹配。
     * 后端已按「完全相等 → 前缀 → 包含」排好序，这里只做透传。
     */
    async queryWellSuggestions(query, cb) {
      const kw = String(query || '').trim()
      if (kw.length < 1) {
        this.wellSuggestLoading = false
        cb([])
        return
      }
      this.wellSuggestLoading = true
      // 防止旧请求覆盖新结果（快速输入时后发先至）
      const seq = ++this.wellSuggestSeq
      try {
        const res = await fetchWellSuggest(kw, 20)
        // request 拦截器返回的是 ApiResponse（{code,message,data}），这里要取 data
        const list = Array.isArray(res) ? res : ((res && res.data) || [])
        if (seq !== this.wellSuggestSeq) return
        // 精确命中的那条顺便记住，供保存时回填 wellId / 提示
        const hit = list.find(x => x.exact)
        this.wellLibraryMatched = hit || null
        // el-autocomplete 要求候选项带 value 字段作为显示文本
        cb(list.map(x => ({ ...x, value: x.wellName })))
      } catch (e) {
        if (seq === this.wellSuggestSeq) cb([])
      } finally {
        if (seq === this.wellSuggestSeq) this.wellSuggestLoading = false
      }
    },

    /** 选中候选项 → 回填井号 / 井型 / 井别 / 区块 */
    onWellSuggestionSelect(item) {
      if (!item) return
      this.wellLibraryMatched = item
      this.wellForm.name = item.wellName || ''
      if (item.wellType) this.wellForm.wellType = item.wellType

      // 区块：后端 CD_WELL 无区块字段，由 WellMasterService 用「井名前缀 → 区块字典」
      // 解析出编码(blockCodeId) + 名称(block)，这里直接用后端给的值，不再依赖
      // blockOptions 是否已加载、也不再靠名称反查编码（名称重复时会对错）。
      const codeId = item.blockCodeId ? String(item.blockCodeId) : ''
      const blockName = item.block ? String(item.block) : ''

      if (codeId) {
        this.wellForm.blockCodeId = codeId
        this.wellForm.block = blockName || this.blockLabel(codeId)
        // 把命中的区块并入下拉选项，保证 el-select 能显示出可读名称
        const exists = this.blockOptions.some(o => o.value === codeId)
        if (!exists && this.wellForm.block) {
          this.blockOptions = [{ value: codeId, label: this.wellForm.block }].concat(this.blockOptions)
        }
        // 后台刷新一份完整选项，方便用户再手工改（失败不影响已回填的值）
        // 注意 loadBlockOptions 在已有选项时会直接 return，这里要的是强制刷新
        if (!exists) this.loadDropdownOptions()
      } else if (blockName) {
        // 兜底：只有名称没编码（词典里查不到，如非断块类区块）
        this.wellForm.block = blockName
        const found = this.blockOptions.find(o => o.label === blockName)
        if (found) this.wellForm.blockCodeId = found.value
      }

      if (this.$refs.wellForm) this.$refs.wellForm.clearValidate('name')
    },

    /** 输入框回车：有精确匹配就回填，否则直接提交 */
    onWellInputEnter() {
      if (this.wellLibraryMatched && this.wellLibraryMatched.wellName === this.wellForm.name.trim()) {
        this.onWellSuggestionSelect(this.wellLibraryMatched)
      }
      this.submitWell()
    },

    /* ------------------------- 树交互 ------------------------- */

    nodeIcon(data) {
      if (data.type === 'root') return 'el-icon-s-platform'
      if (data.type === 'folder') return 'el-icon-folder'
      return 'el-icon-s-data'
    },

    filterNode(value, data) {
      if (data.type !== 'well') return true
      if (!value) return true
      return String(data.label || '').toLowerCase().includes(String(value).toLowerCase())
    },

    onNodeClick(data, node) {
      this.currentNode = { key: node.key, type: data.type, label: node.label, id: data.id }
      this.page = 1
      // 用户主动点了别的节点，说明「刚打开」那次定位已经结束，清掉绿标
      if (this.justOpenedWellId && this.justOpenedWellId !== node.key) {
        this.justOpenedWellId = ''
      }
      if (data.type === 'well' && data.raw) {
        // 点击井号 → 直接进入单井工作台
        this.openWell(data.raw)
      }
    },

    onNodeContextMenu(event, data, node) {
      event.preventDefault()
      event.stopPropagation()
      // 右键即选中
      if (this.$refs.objectTree) this.$refs.objectTree.setCurrentKey(node.key)
      this.currentNode = { key: node.key, type: data.type, label: node.label, id: data.id }
      if (this.justOpenedWellId && this.justOpenedWellId !== node.key) {
        this.justOpenedWellId = ''
      }

      const menuWidth = 170
      const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
      const top = Math.min(event.clientY, window.innerHeight - 240)
      this.contextMenu = {
        visible: true,
        left: Math.max(0, left),
        top: Math.max(0, top),
        nodeType: data.type,
        key: node.key
      }
    },

    bindGlobalClick() {
      document.addEventListener('click', this.hideContextMenu)
      window.addEventListener('resize', this.hideContextMenu)
    },

    hideContextMenu() {
      if (this.contextMenu.visible) this.contextMenu.visible = false
    },

    /* ------------------------- 右键菜单动作 ------------------------- */

    menuCreateWell() {
      this.hideContextMenu()
      const node = this.currentNode
      this.openWellDialog(null, node.type === 'folder' ? node.id : '')
    },

    menuCreateFolder() {
      this.hideContextMenu()
      this.openFolderDialog(this.currentNode.type === 'folder' ? this.currentNode.id : '')
    },

    menuOpenWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.openWell(well)
    },

    menuGeologicalWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.openGeologicalDoc(well)
    },

    menuDesignDoc() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.openDesignDoc(well)
    },

    menuExtractWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.goExtract(well)
    },

    menuPerforationWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.openPerforationAgent(well)
    },

    menuEditWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.openWellDialog(well)
    },

    menuRemoveWell() {
      this.hideContextMenu()
      const well = this.wells.find(w => w.id === this.contextMenu.key)
      if (well) this.removeWell(well)
    },

    menuRenameFolder() {
      this.hideContextMenu()
      const folder = this.folders.find(f => f.id === this.contextMenu.key)
      if (!folder) return
      this.$prompt('请输入新的文件夹名称', '重命名文件夹', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: folder.name,
        inputValidator: (v) => (v && v.trim() ? true : '名称不能为空')
      }).then(async ({ value }) => {
        const name = value.trim()
        try {
          await storeRenameFolder(folder.id, name, this.userId)
          folder.name = name
          this.$message.success('已重命名')
        } catch (e) {
          this.$message.error((e && e.message) || '重命名失败')
        }
      }).catch(() => {})
    },

    menuRemoveFolder() {
      this.hideContextMenu()
      const folder = this.folders.find(f => f.id === this.contextMenu.key)
      if (!folder) return
      const ids = this.collectFolderIds(folder.id)
      const wellCount = this.wells.filter(w => ids.includes(w.folderId || '')).length
      const tip = wellCount
        ? `文件夹「${folder.name}」及其子文件夹内有 ${wellCount} 个井号，删除后这些井号将移动到根节点（不会被删除）。是否继续？`
        : `确定删除文件夹「${folder.name}」吗？`
      this.$confirm(tip, '删除文件夹', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await storeRemoveFolder(folder.id, this.userId)
          if (this.currentNode.type === 'folder' && ids.includes(this.currentNode.id)) {
            this.currentNode = { key: ROOT_ID, type: 'root', label: this.rootLabel, id: '' }
          }
          await this.loadTree()
          this.$message.success('已删除文件夹')
        } catch (e) {
          this.$message.error((e && e.message) || '删除失败')
        }
      }).catch(() => {})
    },

    menuReload() {
      this.hideContextMenu()
      this.loadTree()
      this.$message.success('已刷新')
    },

    /* ------------------------- 文件夹 ------------------------- */

    openFolderDialog(parentId) {
      this.$prompt('请输入文件夹名称', '新建文件夹', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '如：郑58井组'
      }).then(async ({ value }) => {
        const name = String(value || '').trim()
        if (!name) {
          this.$message.warning('名称不能为空')
          return
        }
        try {
          const { folder } = await storeCreateFolder({
            name,
            parentId: parentId || '',
            userId: this.userId
          })
          await this.loadTree()
          this.currentNode = { key: folder.id, type: 'folder', label: folder.name, id: folder.id }
          this.$message.success('文件夹已创建')
        } catch (e) {
          this.$message.error((e && e.message) || '创建文件夹失败')
        }
      }).catch(() => {})
    },

    /* ------------------------- 井号增改删 ------------------------- */

    openWellDialog(well, presetFolderId) {
      let blockCodeId = ''
      if (well && well.block) {
        // 根据现有 block 名称反查 blockCodeId
        const found = this.blockOptions.find(o => o.label === well.block)
        blockCodeId = found ? found.value : ''
      }
      this.wellForm = {
        id: well ? well.id : '',
        name: well ? well.name : '',
        folderId: well ? (well.folderId || '') : (presetFolderId || ''),
        block: well ? (well.block || '') : '',
        blockCodeId: well ? (well.blockCodeId || blockCodeId) : '',
        perforationMethod: well ? (well.perforationMethod || '') : '',
        wellType: well ? (well.wellType || '') : '',
        remark: well ? (well.remark || '') : ''
      }
      this.wellLibraryMatched = null
      this.wellDialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.wellForm) this.$refs.wellForm.clearValidate()
      })
    },

    onWellDialogClosed() {
      this.wellLibraryMatched = null
      this.wellForm = { id: '', name: '', folderId: '', block: '', blockCodeId: '', perforationMethod: '', wellType: '', remark: '' }
    },

    /**
     * 井号净化：去掉所有空白字符 + 全角转半角。
     *
     * 为什么必须做：中文输入法在「-」后会自动补空格（如「安13-5- 3平1」），
     * 从 Word/Excel 复制粘贴也常带零宽空格或全角「－」。
     * 一旦带进库，`/v1/wells/suggest` 的精确匹配就失效（返回 exact=false 或空），
     * 井号不会被关联到井库 CD_WELL，后续 wellId / 井型 / 区块 全部丢失，
     * 表现为「建完井号后井号看着是歪的、和井库对不上」。
     */
    sanitizeWellName(raw) {
      return String(raw || '')
        // 半角空格、全角空格、制表、换行、零宽字符、NBSP
        .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, '')
        // 全角 ASCII 区（！-～）转半角，覆盖「－」「Ａ」「１」等
        .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .trim()
    },

    /** 输入框实时净化：用户边打边清，避免把空格带进后续逻辑 */
    onWellNameInput(val) {
      const clean = this.sanitizeWellName(val)
      if (clean !== val) this.wellForm.name = clean
      // 井号变了，之前的井库匹配结论作废
      if (this.wellLibraryMatched && this.wellLibraryMatched.wellName !== clean) {
        this.wellLibraryMatched = null
      }
    },

    validateWellNameUnique(rule, value, callback) {
      const name = this.sanitizeWellName(value)
      if (!name) return callback()
      const dup = this.wells.some(w => w.name === name && w.id !== this.wellForm.id)
      if (dup) return callback(new Error('该井号已存在'))
      callback()
    },

    submitWell() {
      const form = this.$refs.wellForm
      if (!form) return
      form.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          // ⚠️ 必须走 sanitizeWellName：中文输入法会在「-」后自动补空格，
          // 带空格的井号在 suggest 接口里精确匹配不到，会退化成「手工创建」。
          const name = this.sanitizeWellName(this.wellForm.name)
          this.wellForm.name = name
          // 根据 blockCodeId 同步 wellBlock 展示名
          const blockDisplay = this.wellForm.blockCodeId
            ? (this.blockOptions.find(o => o.value === this.wellForm.blockCodeId) || {}).label || this.wellForm.block.trim()
            : this.wellForm.block.trim()
          const base = {
            name,
            folderId: this.wellForm.folderId || '',
            block: blockDisplay,
            blockCodeId: this.wellForm.blockCodeId || '',
            perforationMethod: this.wellForm.perforationMethod || '',
            wellType: this.wellForm.wellType.trim(),
            remark: this.wellForm.remark.trim()
          }

          if (this.wellForm.id) {
            // 编辑
            await storeUpdateWell(this.wellForm.id, base, this.userId)
            this.$message.success('已保存')
          } else {
            // 新建：优先用联想阶段已命中的 CD_WELL 主数据；
            // 若用户没点候选项而是直接输入，再用 suggest 做一次精确匹配兜底。
            // 注意：这里不用 /wells/master —— 它在查不到时会返回 code=-1，
            // 被 axios 拦截器弹红条「井库中未找到该井号」，但手工建井是正常业务，不该报错。
            let hit = this.wellLibraryMatched
            if (!hit || hit.wellName !== name) {
              hit = null
              try {
                const res = await fetchWellSuggest(name, 20)
                const list = Array.isArray(res) ? res : ((res && res.data) || [])
                hit = list.find(x => x.exact && x.wellName === name) || null
              } catch (e) {
                hit = null
              }
            }
            const result = await storeCreateWell({
              ...base,
              block: base.block || (hit ? hit.block : ''),
              wellType: base.wellType || (hit ? hit.wellType : ''),
              wellId: hit ? hit.wellId : '',
              status: '待生成',
              source: hit ? '井库匹配' : '手工创建'
            }, this.userId)

            if (result.existed) {
              // 井号已存在：直接打开已有记录，不算报错
              this.$message({ type: 'warning', message: `井号「${name}」已存在，正在打开…`, duration: 2500 })
              this.openWell(result.well)
              this.wellDialogVisible = false
              return
            }

            if (!hit) {
              this.$message({
                type: 'warning',
                message: `井号「${name}」未在井库（CD_WELL）中匹配到，已按手工创建保存`,
                duration: 3500
              })
            } else {
              this.$message.success(`井号已创建（关联井库 ${hit.wellId}）`)
            }
          }

          // 新建完只定位到根，清掉「刚打开」残留（否则树选中会被抢回旧井）
          this.highlightWellId = ''
          this.justOpenedWellId = ''
          await this.loadTree()
          // 定位到根节点
          this.currentNode = {
            key: ROOT_ID,
            type: 'root',
            label: this.rootLabel,
            id: ''
          }
          this.$refs.objectTree && this.$refs.objectTree.setCurrentKey(ROOT_ID)
          this.wellDialogVisible = false
        } catch (e) {
          this.$message.error((e && e.message) || '保存失败')
        } finally {
          this.submitting = false
        }
      })
    },

    removeWell(well) {
      this.$confirm(`确定删除井号「${well.name}」吗？`, '删除井号', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await storeRemoveWell(well.id, this.userId)
          // 删掉的正是「刚打开」那口井 → 标记和一次性高亮都要撤掉
          if (this.justOpenedWellId === well.id) this.justOpenedWellId = ''
          if (this.highlightWellId === well.id) this.highlightWellId = ''
          await this.loadTree()
          this.$message.success('已删除')
        } catch (e) {
          this.$message.error((e && e.message) || '删除失败')
        }
      }).catch(() => {})
    },

    /* ------------------------- 跳转 ------------------------- */

    openWell(well) {
      const wellId = well.wellId || ''
      if (!wellId) {
        this.$message({
          type: 'warning',
          message: `井号「${well.name}」尚未关联井库记录，单井工作台将以空数据打开`,
          duration: 3000
        })
      }
      this.$store.commit('well/SET_SELECTED_WELL', {
        wellId,
        wellName: well.name,
        block: well.block,
        wellType: well.wellType
      })
      // 文档区按「工作台井号」归档，需要把 wbWellId 一并带到单井页
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: well.id || '',
          wellId,
          wellName: well.name || '',
          userId: this.userId || ''
        }))
      } catch (e) {
        // 忽略存储失败
      }
      this.$router.push({
        name: 'WellWorkbench',
        params: { wellId: wellId || `local~${well.id}` },
        query: well.id ? { wbWellId: well.id } : {}
      })
    },

    /**
     * 跳转到「射孔方案智能生成」页。
     */
    openPerforationAgent(well) {
      const wellName = String((well && well.name) || '').trim()
      const wbWellId = well.id || ''
      if (!wbWellId) {
        this.$message.warning('该井号缺少工作台 ID，无法进入射孔方案')
        return
      }
      // 缓存井号列表，便于射孔方案页选择其他井号
      try {
        const opts = this.wells.map(w => ({ wbWellId: w.id, wellName: w.name }))
        sessionStorage.setItem('wbWellOptions', JSON.stringify(opts))
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId,
          wellName,
          userId: this.userId || ''
        }))
      } catch (e) { /* ignore */ }
      this.$router.push({
        name: 'PerforationAgent',
        query: { wellName, wbWellId }
      })
    },

    /**
     * 跳转到「智能提取」页，并把井号通过 URL query 带过去。
     * 提取页会自动预填井名，用户上传完文件点「严格提取」无需再手输井名，
     * 生成的文件名也自动为「井名+压裂工程设计文档.docx」。
     */
    goExtract(well) {
      const wellName = String((well && well.name) || '').trim()
      if (!wellName) {
        this.$message.warning('该井号没有名称，无法带入智能提取')
        return
      }
      // 顺带写入选中井，便于下游页面/刷新后仍能拿到
      this.$store.commit('well/SET_SELECTED_WELL', {
        wellId: well.wellId || '',
        wellName,
        block: well.block,
        wellType: well.wellType
      })
      this.$router.push({
        name: 'ReportExtract',
        query: { wellName, from: 'workbench' }
      })
    },

    /* ===================== 工程设计成果 / 压裂地质设计：预览 / 下载 ===================== */

    /**
     * 打开某口井的「压裂工程设计成果」弹窗（列表操作列入口）。
     *
     * <p>只展示系统生成的成果（{@code DOC_TYPE='GENERATED_REPORT'}
     * 且 {@code DOC_SOURCE='GENERATED'}），可预览/下载。
     *
     * <p>为什么还要传 docSource：{@code GENERATED_REPORT} 下混着手工导出的散图
     * （如煤岩破碎指数图，docSource=MANUAL）。只按 docType 查会把那些图列成
     * 「设计成果」，用户点开发现不是文档。口径必须与后端 latestGeneratedByWell 一致。
     *
     * @param well 井号行（treeStore.mapWell 出来的对象）
     */
    openDesignDoc(well) {
      if (!well) return
      const wbWellId = well.id || ''
      if (!wbWellId) {
        this.$message.warning('该井号缺少工作台 ID，无法关联工程设计成果')
        return
      }
      this.geoDialog.docType = 'GENERATED_REPORT'
      this.geoDialog.visible = true
      this.geoDialog.wbWellId = wbWellId
      this.geoDialog.wellName = well.name || ''
      this.geoDialog.docs = []
      this.loadGeoDocs()
    },

    /**
     * 打开某口井的「压裂地质设计」弹窗（右键菜单入口，含上传入库）。
     *
     * <p>不直接跳单井工作台，是因为用户常常要逐口井过一遍资料，
     * 跳页面会丢掉列表当前的筛选/翻页位置；弹窗里看完接着点下一口即可。
     *
     * @param well 井号行（treeStore.mapWell 出来的对象）
     */
    openGeologicalDoc(well) {
      if (!well) return
      const wbWellId = well.id || ''
      if (!wbWellId) {
        this.$message.warning('该井号缺少工作台 ID，无法关联地质设计')
        return
      }
      this.geoDialog.docType = 'GEOLOGICAL_DESIGN'
      this.geoDialog.visible = true
      this.geoDialog.wbWellId = wbWellId
      this.geoDialog.wellName = well.name || ''
      this.geoDialog.docs = []
      this.loadGeoDocs()
    },

    /**
     * 历史版本行加淡色底，让「当前版」在一堆同名列里一眼能挑出来。
     *
     * <p>为什么要靠行样式而不只靠标签：地质设计常是同一份文件反复入库
     * （文件名、大小完全一样，只有版本号和上传时间不同），
     * 只有绿色小标签时很容易点错行去下载历史版。
     */
    geoRowClass({ row }) {
      return row && row.isCurrent === '1' ? '' : 'wb-geo__row--old'
    },

    /**
     * 拉取当前模式下的文档列表（含历史版本，按版本倒序）。
     *
     * <p>成果模式额外带 {@code docSource:'GENERATED'}：{@code GENERATED_REPORT}
     * 里混着手工导出的散图（docSource=MANUAL），不带这个条件会把散图列为成果。
     */
    async loadGeoDocs() {
      const wbWellId = this.geoDialog.wbWellId
      if (!wbWellId) return
      const isGenerated = this.geoDialog.docType === 'GENERATED_REPORT'
      this.geoDialog.loading = true
      try {
        const params = { docType: this.geoDialog.docType }
        // 只对成果模式加来源过滤；地质设计是上传资料，docSource 可能是 MANUAL 或空
        if (isGenerated) params.docSource = 'GENERATED'
        const res = await listWellDocs(wbWellId, params)
        const list = (res && res.data) || []
        // 后端已按 SORT_NO / CREATE_DATE 排过，这里再按版本号兜一层：
        // 同一口井可能存在「先传 v2 再补 v1」的历史数据，靠 sortNo 会乱序。
        this.geoDialog.docs = list.slice().sort((a, b) => {
          const va = Number(a.versionNo || 0)
          const vb = Number(b.versionNo || 0)
          if (va !== vb) return vb - va
          return String(b.createDate || '').localeCompare(String(a.createDate || ''))
        })
      } catch (e) {
        this.geoDialog.docs = []
        this.$message.error((isGenerated ? '读取工程设计成果失败：' : '读取地质设计失败：')
          + ((e && e.message) || '未知错误'))
      } finally {
        this.geoDialog.loading = false
      }
    },

    /** 触发原生文件选择（不弹第二个对话框，选完直接上传入库） */
    pickGeoFile() {
      const el = this.$refs.geoFile
      if (!el) return
      el.value = ''   // 允许连续选同一个文件
      el.click()
    },

    /**
     * 选中文件 → 上传入库。
     *
     * 走 /v1/workbench/well/{wbWellId}/doc/upload，docType 固定 GEOLOGICAL_DESIGN。
     * 后端会自动分配版本号（同井同类型递增）并把旧版本 IS_CURRENT 置 0，
     * 前端不做任何版本计算 —— 版本号只有后端 tagOf() 一个映射点。
     */
    async onGeoFilePicked(e) {
      const file = e && e.target && e.target.files && e.target.files[0]
      if (!file) return
      const name = String(file.name || '').toLowerCase()
      if (!/\.(docx?|pdf)$/.test(name)) {
        this.$message.warning('仅支持 doc / docx / pdf 格式的地质设计')
        return
      }
      const wbWellId = this.geoDialog.wbWellId
      this.geoDialog.uploading = true
      try {
        await uploadWellDoc(wbWellId, file, {
          docType: 'GEOLOGICAL_DESIGN',
          wellName: this.geoDialog.wellName,
          userId: this.userId
        })
        this.$message.success('已入库：' + file.name)
        await this.loadGeoDocs()
        // 列表/树上的「地质设计」标记要跟着亮，否则用户会以为没存进去
        await this.refreshTreeQuietly()
      } catch (err) {
        this.$message.error('入库失败：' + ((err && err.message) || '未知错误'))
      } finally {
        this.geoDialog.uploading = false
      }
    },

    /**
     * 查看（在线预览）。
     * 沿用单井工作台同一套策略：docx 用 docx-preview 前端渲染，
     * pdf 用 iframe 交给浏览器；其余格式提示下载。
     */
    async viewGeoDoc(row) {
      if (!row || !row.docId) return
      const ext = String(row.fileExt || '').toLowerCase()
      this.geoPreview.visible = true
      this.geoPreview.loading = true
      this.geoPreview.kind = 'none'
      this.geoPreview.title = row.fileName
        || (this.isGeneratedMode ? '工程设计成果预览' : '地质设计预览')
      this.clearGeoObjectUrl()

      try {
        const { blob } = await previewWellDoc(row.docId)
        if (ext === 'pdf') {
          this.geoPreview.url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
          this.geoPreview.kind = 'iframe'
        } else if (ext === 'docx') {
          this.geoPreview.kind = 'docx'
          await this.renderGeoDocx(blob)
        } else {
          // .doc 是二进制老格式，docx-preview 不支持；提示下载而不是渲染出一片空白
          this.geoPreview.kind = 'none'
        }
      } catch (e) {
        this.geoPreview.kind = 'none'
        this.$message.error('预览失败，请尝试下载后查看')
      } finally {
        this.geoPreview.loading = false
      }
    },

    /**
     * docx → HTML（docx-preview，按需加载避免拖慢首屏）。
     *
     * ⚠️ 必须 await 到渲染真正结束再返回：
     *    早先写成 `this.$nextTick(async () => {...})` 不 await，
     *    调用方 viewGeoDoc 的 finally 会立刻把 loading 关掉，
     *    大文档（地质设计常见 2~3MB）就会出现「遮罩没了但正文还是空白」的假死感。
     */
    async renderGeoDocx(blob) {
      const docxPreview = await import(/* webpackChunkName: "docx-preview" */ 'docx-preview')
      // 等一个 tick 让 el-drawer 的 DOM 挂载完成，否则 $refs.geoDocxBox 还是 undefined
      await this.$nextTick()
      const box = this.$refs.geoDocxBox
      if (!box) return
      box.innerHTML = ''
      try {
        await docxPreview.renderAsync(blob, box, null, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: true,
          breakPages: true,
          experimental: true
        })
      } catch (e) {
        this.geoPreview.kind = 'none'
      }
    },

    /** 下载：文件名以库里记录为准（文档中心可能返回带时间戳的存储名） */
    downloadGeoDoc(row) {
      if (!row || !row.docId) return
      downloadWellDoc(row.docId).then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.fileName || 'document'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // 延迟回收：立即 revoke 在部分浏览器会让下载拿到空文件
        setTimeout(() => URL.revokeObjectURL(url), 3000)
      }).catch(err => {
        this.$message.error((err && err.message) || '下载失败')
      })
    },

    clearGeoPreview() {
      this.clearGeoObjectUrl()
      this.geoPreview.kind = 'none'
      this.geoPreview.title = ''
      if (this.$refs.geoDocxBox) this.$refs.geoDocxBox.innerHTML = ''
    },

    clearGeoObjectUrl() {
      if (this.geoPreview.url) {
        URL.revokeObjectURL(this.geoPreview.url)
        this.geoPreview.url = ''
      }
    },

    /**
     * 静默刷新对象树（入库后让「地质」徽标和操作列状态同步）。
     * 失败不打扰用户：弹窗里的文档列表已经是最新的了。
     */
    async refreshTreeQuietly() {
      try {
        await this.loadTree()
      } catch (e) {
        /* 忽略：树刷新失败不影响弹窗内已加载的列表 */
      }
    },

    /** 文件大小展示 */
    fmtSize(bytes) {
      const n = Number(bytes || 0)
      if (n <= 0) return '-'
      if (n < 1024) return n + ' B'
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
      return (n / 1024 / 1024).toFixed(2) + ' MB'
    },

    /* ------------------------- 工具 ------------------------- */

    formatNow() {
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.workbench {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  // 留白原先由 AppMain 的 padding 提供；AppMain 改为统一铺浅灰底后不再带 padding，
  // 这里必须自己补上，否则两个面板会贴到视口边缘。
  padding: 16px 20px;
  box-sizing: border-box;
}

/* ============ 面板通用 ============ */
.wb-panel {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.wb-panel--fill {
  flex: 1;
  min-height: 0;
}

.wb-panel__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.wb-panel__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  i {
    color: #409eff;
  }
}

.wb-panel__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.wb-search {
  width: 200px;
}

.wb-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.wb-panel__body--table {
  padding: 0;
  overflow: hidden;
}

.wb-panel__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.wb-total {
  font-size: 12px;
  color: #909399;
}

/* ============ 左：对象树（3/10） ============ */
.wb-left {
  flex: 0 0 30%;
  max-width: 30%;
  min-width: 0;
  min-height: 0;
  display: flex;

  /* 关键：让内部 .wb-panel 撑满这 30% 的宽度，
     否则 panel 会收缩到内容宽度，右侧留出一条空隙 */
  > .wb-panel {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
  }
}

/* ============ 右：井号列表（7/10） ============ */
.wb-right {
  flex: 1 1 70%;
  max-width: 70%;
  min-width: 0;
  min-height: 0;
  display: flex;

  > .wb-panel {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
  }
}

/* ============ 树节点 ============ */
.wb-node {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.wb-node__label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.wb-node__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-node__badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  text-align: center;
}

/* 从单井工作台「返回对象树」时的「刚打开」标记。
 * 返回后视图会回到根节点（右侧展示全部井号），树可能很长，
 * 用这个绿色小标签把刚才那口井从视觉上挑出来。 */
.wb-node__from {
  flex-shrink: 0;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: #f0f9eb;
  color: #67c23a;
  font-size: 11px;
}

/* 树节点上的「地质」徽标：不点进去就能看出这口井有没有上传地质设计。
 * 用蓝色系（#409eff）而不是绿色，避免和「刚打开」「已生成」两个绿色标记混淆。 */
.wb-node__geo {
  flex-shrink: 0;
  margin-left: 4px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  border: 1px solid #d9ecff;
}

.wb-node--root {
  font-weight: 600;
}
.wb-node--folder .wb-node__label i {
  color: #e6a23c;
}

.wb-node--well .wb-node__label i {
  color: #409eff;
}

/* ============ 井号链接 ============ */
.wb-well-link {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.wb-danger {
  color: #f56c6c !important;
}

/* ============ 状态列 ============ */
.wb-status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;

  i {
    font-size: 13px;
  }

  /* 版本数量角标：只有 >1 版才显示，提醒用户还有旧版本可回溯 */
  em {
    font-style: normal;
    margin-left: 1px;
    padding: 0 4px;
    border-radius: 8px;
    font-size: 11px;
    background: #e8f3ff;
    color: #409eff;
  }
}

.wb-status--done {
  color: #67c23a;
  cursor: default;
}

.wb-status--none {
  color: #c0c4cc;
}

/* ============ 资料收集进度（未生成井） ============
   一条细进度条 + 数字。数字必看，条形只提供「扫一眼大概」的直觉 ——
   只有数字的话 10 行列表扫下来还是得逐个读；只有条形则分不清 25% 和 30%。 */
.wb-status--progress {
  justify-content: center;
  cursor: pointer;
}

.wb-progress {
  position: relative;
  width: 46px;
  height: 6px;
  border-radius: 3px;
  background: #ebeef5;
  overflow: hidden;
  flex-shrink: 0;
}

.wb-progress__bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  /* 0% 时也留 2px：否则整列看起来是空的，用户会以为这一列没数据而不是「一份没传」 */
  min-width: 2px;
  border-radius: 3px;
  background: #409eff;
  transition: width .3s;
}

/* 收齐了给绿色：列表里一眼看出「这口井可以生成了」 */
.wb-status--progress.is-full .wb-progress__bar { background: #67c23a; }

/* 一份没传给灰色，避免整列蓝色让 0% 和 25% 看起来一样 */
.wb-status--progress.is-zero .wb-progress__bar { background: #dcdfe6; }

.wb-progress__num {
  min-width: 34px;
  text-align: right;
  color: #909399;
  font-variant-numeric: tabular-nums;
}

.wb-status--progress.is-full .wb-progress__num { color: #529b2e; }

.wb-progress-tip {
  max-width: 300px;
  line-height: 1.65;
  font-size: 12px;
  white-space: pre-line;
}

/* ============ 右键菜单 ============ */
.wb-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 160px;
  padding: 4px 0;
  margin: 0;
  list-style: none;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    font-size: 13px;
    color: #303133;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;

    i {
      color: #909399;
      font-size: 13px;
    }

    &:hover {
      background: #ecf5ff;
      color: #409eff;

      i {
        color: #409eff;
      }
    }

    &.divided {
      border-top: 1px solid #f0f0f0;
      margin-top: 4px;
      padding-top: 8px;
    }
  }

  .wb-context-menu__danger:hover {
    background: #fef0f0;
    color: #f56c6c;

    i {
      color: #f56c6c;
    }
  }
}

.wb-form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;

  i {
    color: #409eff;
  }

  &__hit {
    margin-left: 6px;
    color: #67c23a;

    i {
      color: #67c23a;
    }
  }

  /* 井库未匹配：不阻断创建，但要让人一眼看出「这条不会关联井库」 */
  &__miss {
    display: block;
    margin-top: 2px;
    color: #e6a23c;

    i {
      color: #e6a23c;
    }
  }
}

/* ============ 操作列：地质设计按钮 ============ */
/* 已上传时按普通链接色；没有时压暗到灰色 —— 按钮始终可点（点进去可上传入库），
 * 靠颜色区分「有没有」比直接 disabled 更有用：用户往往就是想说「这口还没有，补一份」。 */
.wb-op--muted {
  color: #c0c4cc !important;
}

/* ============ 地质设计弹窗 ============ */
.wb-geo__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.wb-geo__hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.wb-geo__bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 原生 input 隐藏但保留可点击能力，用按钮代理触发 */
.wb-geo__file {
  display: none;
}

.wb-geo__icon {
  color: #909399;
  margin-right: 4px;
}

.wb-geo__ops {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;

  .el-button {
    margin-left: 0;
    padding: 0 4px;
    font-size: 12px;
  }
}

.wb-geo__foot-tip {
  float: left;
  font-size: 12px;
  color: #909399;
  line-height: 32px;
}

/* 文件名下方的来源说明（备注）。同一份文件反复入库时文件名和大小完全一样，
 * 只有这里（「从知识库提取（原始文档：xxx）」/「手工上传」）能区分。 */
.wb-geo__remark {
  margin-top: 2px;
  font-size: 11px;
  color: #a8abb2;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 历史版本：整行淡灰 + 版本号褪色，让「当前版」在同名列里一眼可辨 */
.wb-geo__row--old {
  background: #fafafa;

  .el-icon-document {
    color: #c0c4cc;
  }
}

.wb-geo__ver--old {
  color: #a8abb2;
}

.wb-nowrap {
  white-space: nowrap;
}

/* ============ 地质设计预览抽屉 ============ */
.wb-geo__preview {
  height: 100%;
  padding: 0 12px 12px;
  overflow: auto;
}

.wb-geo__preview-frame {
  width: 100%;
  height: 100%;
  min-height: 70vh;
  border: none;
  background: #525659;
}

.wb-geo__preview-docx {
  background: #f0f2f5;
  padding: 12px 0;
  min-height: 70vh;

  ::v-deep .docx-wrapper {
    background: #f0f2f5;
    padding: 0;

    > section.docx {
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
      margin-bottom: 14px;
    }
  }
}
</style>

<style lang="scss">
/* 井库联想下拉
 * popper-append-to-body=false → 下拉挂在弹窗内部，不跟 dialog 的 z-index 打架。
 * 但 ElementUI 的 popper 定位贴的是 input 的底边，而输入框下面紧跟一行说明文字，
 * 展开后会把说明盖住、看起来像「候选没显示」。这里给最小高度兜底 + 加投影区分层级。
 */
.el-dialog .wb-well-suggest {
  z-index: 3000;

  &.el-autocomplete-suggestion {
    min-width: 420px;
    max-height: 260px;
    overflow-y: auto;
    border-radius: 4px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  }
}

.wb-well-suggest {
  .wb-suggest-item {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.5;

    &__name {
      flex: 1 1 auto;
      font-weight: 500;
      color: #303133;
    }

    &__tag {
      flex: 0 0 auto;
      font-size: 12px;
      color: #909399;
    }

    &__block {
      flex: 0 0 auto;
      font-size: 12px;
      color: #409eff;
    }
  }

  li {
    padding: 6px 12px !important;
    line-height: 1.5 !important;
  }
}
</style>
