<template>
  <div class="pa-page">
    <!-- 顶部：井信息 + 操作 -->
    <div class="pa-hero">
      <div class="pa-hero__left">
        <div class="pa-hero__icon"><i class="el-icon-s-grid"></i></div>
        <div>
          <div class="pa-hero__title">
            射孔方案智能生成
            <el-tag size="mini" type="success" effect="plain">分段优化</el-tag>
            <el-tag size="mini" type="info" effect="plain">MSE避让</el-tag>
          </div>
          <div class="pa-hero__meta">
            <span>井号：{{ wellName || '-' }}</span>
            <span>WB_ID：{{ wbWellId || '-' }}</span>
          </div>
        </div>
      </div>
      <div class="pa-hero__actions">
        <el-button size="small" icon="el-icon-arrow-left" @click="goBack">返回工作台</el-button>
      </div>
    </div>

    <!-- 主体：左配置面板 / 右结果面板 -->
    <div class="pa-body">
      <!-- 左：配置 -->
      <div class="pa-config">
        <el-card shadow="never" class="pa-config__card">
          <div slot="header" class="pa-config__header">
            <span><i class="el-icon-setting"></i> 方案配置</span>
          </div>

          <!-- 可滚动的内容区：字段多时在这里滚，操作按钮不跟着跑出屏幕 -->
          <div class="pa-config__scroll">

          <!--
            井号不再提供下拉切换：本页是「单井」的射孔方案工作台，
            井号由进入时的 URL（wbWellId + wellName）唯一确定。
            保留下拉会让人误以为能在这里换井，而换井意味着整批材料、
            文档、已保存版本全部要换一遍 —— 那是「返回工作台重进」的语义，
            不是本页该做的事（页面头部已显示当前井号，右上角有「返回工作台」）。
          -->

          <!-- 设计文档（作为源文档，决定分段/射孔段区间） -->
          <div class="pa-section">
            <div class="pa-section__title">设计文档</div>
            <div class="pa-checklist">
              <div class="pa-checklist__item pa-checklist__item--doc">
                <el-checkbox v-model="useDesignDoc" :disabled="!designDocSource">
                  压裂地质设计
                </el-checkbox>
                <el-tooltip
                  v-if="designDocSource"
                  :content="designDocSource.name"
                  placement="top"
                >
                  <el-tag size="mini" type="success">{{ designDocTagText }}</el-tag>
                </el-tooltip>
                <el-tag v-else size="mini" type="info">未找到</el-tag>
              </div>
            </div>
            <div class="pa-doc-hint">
              <span class="pa-doc-hint__text">{{ designDocHint }}</span>
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                accept=".doc,.docx,.xls,.xlsx"
                :on-change="onDesignDocPicked"
              >
                <el-button type="text" size="mini" icon="el-icon-upload2">
                  {{ designDocSource ? '改用本地文件' : '本地选择文件' }}
                </el-button>
              </el-upload>
            </div>
          </div>

          <!-- 附件选择 -->
          <div class="pa-section">
            <div class="pa-section__title">
              附件选择（可选）
              <el-button
                type="text"
                size="mini"
                class="pa-section__reload"
                :loading="attLoading"
                @click="loadAttachmentsFromWorkbench(true)"
              >
                <i class="el-icon-refresh"></i> 重新检索
              </el-button>
            </div>

            <!-- 自动带入来源提示 -->
            <div v-if="autoFillTip" class="pa-autofill">
              <i class="el-icon-magic-stick"></i>
              <span>{{ autoFillTip }}</span>
            </div>

            <!--
              必填材料齐全状态：三项必填（MSE / 套管接箍 / 全烃）收齐后
              进页面会自动生成 2 表 1 图，这里给用户一个明确的状态位。
            -->
            <div
              v-if="attScanned"
              class="pa-ready"
              :class="requiredReady ? 'pa-ready--ok' : 'pa-ready--pending'"
            >
              <i :class="requiredReady ? 'el-icon-circle-check' : 'el-icon-time'"></i>
              <span v-if="requiredReady">必填材料已齐，可自动生成 2 表 1 图</span>
              <span v-else>必填材料 {{ requiredProgress.got }}/{{ requiredProgress.total }}，收齐后自动生成</span>
            </div>

            <div class="pa-checklist">
              <div
                v-for="item in curveItems"
                :key="item.key"
                class="pa-checklist__item"
              >
                <el-checkbox
                  v-model="useFlags[item.useKey]"
                  :disabled="!item.attachment"
                >{{ item.label }}</el-checkbox>
                <el-tooltip
                  v-if="item.attachment"
                  :content="attTip(item.attachment)"
                  placement="top"
                >
                  <el-tag size="mini" type="success">已收集</el-tag>
                </el-tooltip>
                <el-tag v-else size="mini" type="info">未收集</el-tag>
              </div>
            </div>

            <div class="pa-doc-hint pa-doc-hint--tip">
              <span class="pa-doc-hint__text">上述材料均取自单井工作台模块卡片，无需在此重复上传</span>
            </div>
          </div>

          <!-- 参数设置 -->
          <div class="pa-section">
            <div class="pa-section__title">参数设置</div>
            <el-form size="small" label-width="90px" class="pa-params">
              <!--
                三个参数的关系（写在界面上，否则用户看到两个带 m、一个不带，
                会以为是同一个量纲、可以互相比大小）：
                  ① 避让距离  深度值的「半宽」约束 —— 簇顶/底、封隔器与接箍之间
                  ② 最大偏移  簇顶深相对设计点的「浮动半径」—— 只在挑候选点时用
                  ③ MSE 阈值  曲线值的绝对阈值，无量纲，和上面两个米数没有可比性
                实现位置：ClusterDepthOptimizer（①②③ 都参与）、
                         PackerPositionCalculator（只参与 ①）。
              -->
              <el-form-item label="避让距离">
                <el-input-number v-model="params.avoidDistance" :min="0" :max="20" :step="0.5" style="width: 120px" />
                <span class="pa-unit">m</span>
                <div class="pa-param-hint">与套管接箍的最小间距，接箍两侧各留这么多</div>
              </el-form-item>
              <el-form-item label="MSE阈值">
                <el-input-number v-model="params.mseThreshold" :min="1" :max="100" :step="1" style="width: 120px" />
                <span class="pa-unit pa-unit--dimen">（曲线值，无单位）</span>
                <div class="pa-param-hint">只收 MSE ≤ 该值的深度点作为候选</div>
              </el-form-item>
              <el-form-item label="最大偏移">
                <el-input-number v-model="params.maxShift" :min="0" :max="20" :step="0.5" style="width: 120px" />
                <span class="pa-unit">m</span>
                <div class="pa-param-hint">簇顶深相对设计点最多上下浮动这么多</div>
              </el-form-item>
              <el-form-item label="射孔方式">
                <el-radio-group v-model="params.perforationMethod">
                  <el-radio label="全程固井">全程固井</el-radio>
                  <el-radio label="半程固井">半程固井</el-radio>
                  <el-radio label="滑套压裂">滑套压裂</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </div>

          </div><!-- /.pa-config__scroll -->

          <!-- 操作按钮：固定在左栏底部，不随内容滚动消失 -->
          <div class="pa-actions">
            <el-button
              type="primary"
              size="small"
              icon="el-icon-video-play"
              :loading="running"
              :disabled="!selectedWellId"
              @click="runGenerate({ auto: false })"
            >{{ running ? '生成中…' : '开始生成' }}</el-button>
            <el-button size="small" icon="el-icon-refresh-right" @click="resetParams">重置</el-button>
          </div>
        </el-card>
      </div>

      <!-- 右：结果 -->
      <div class="pa-result">
        <el-card shadow="never" class="pa-result__card">
          <div slot="header" class="pa-result__header">
            <span><i class="el-icon-s-data"></i> 生成结果</span>
            <div v-if="result && result.segments" class="pa-result__stats">
              <el-tag size="mini" type="info">共 {{ result.segments.length }} 段</el-tag>
              <el-tag v-if="adjustStats.mse > 0" size="mini" type="warning">MSE优化 {{ adjustStats.mse }}</el-tag>
              <el-tag v-if="adjustStats.packer > 0" size="mini" type="danger">避让 {{ adjustStats.packer }}</el-tag>
            </div>
          </div>

          <div v-loading="running" class="pa-result__body">
            <!-- 空状态：区分「材料没齐」与「材料齐了但还没出结果」两种情况 -->
            <el-empty
              v-if="!result && !running"
              :image-size="80"
              :description="requiredReady
                ? '材料已齐，点左下角「开始生成」即可出 2 表 1 图'
                : `必填材料收取中（${requiredProgress.got}/${requiredProgress.total}），收齐后会自动生成 2 表 1 图`"
            />

            <!-- 生成中提示 -->
            <div v-if="running && !result" class="pa-generating">
              <i class="el-icon-loading"></i>
              <span>{{ generatingText }}</span>
            </div>

            <!-- 结果表格 -->
            <template v-if="result && result.segments">
              <!--
                ⚠️ 曲线图 + 两张表原来是竖排堆叠，全部塞进 .pa-result__body 这个
                固定高度的内层滚动区里：曲线图 280px + 表 1 约 170px 就吃满一屏，
                表 2（煤岩破碎指数，12 簇时高 440px）被挤到可视区外，
                用户以为「只生成了一张表」，实际是滚不到/没意识到要滚。
                改成标签页：一次只渲染一块内容，两张表都完整落在可视区内。
              -->
              <el-tabs v-model="resultTab" class="pa-result__tabs" @tab-click="onResultTabClick">
                <el-tab-pane name="segPlan">
                  <span slot="label">
                    <i class="el-icon-s-grid"></i> （2）分段射孔方案
                    <el-badge :value="segPlanRows.length" type="primary" class="pa-tab-badge" />
                  </span>
                  <!--
                    表 1 严格对齐《压裂工程设计》模板「（2）分段射孔方案」表（11 列）：
                      分段 / 分簇 / 射孔井段（顶深、底深）/ 厚度 / 簇（段）间距 / 垂深 /
                      封隔器位置 / 套管接箍位置 / 射孔方向 / 射孔方式
                      ┌──────┬──────┬─────────────────┬──────────┬──────────────────┬───────────┬────────────────┬──────────────┬──────────┬──────────┐
                      │ 分段 │ 分簇 │ 射孔井段（m）   │ 厚度（m）│ 簇（段）间距（m）│ 垂深（m） │ 封隔器位置（m）│ 套管接箍位置 │ 射孔方向 │ 射孔方式 │
                      │      │      ├────────┬────────┤          │                  │           │                │              │          │          │
                      │      │      │ 顶深   │ 底深   │          │                  │           │                │              │          │          │
                      └──────┴──────┴────────┴────────┴──────────┴──────────────────┴───────────┴────────────────┴──────────────┴──────────┴──────────┘
                    这是标准的两行表头 + 合并单元格（rowspan/colspan），el-table 的
                    单行 header 表达不了，所以这里用原生 table 直接写出模板的合并结构。
                    行高亮仍按调整原因上色（MSE优化黄 / 避让红）。

                    ⚠️ 列顺序必须与后端 SEG_PLAN_HEADERS（导出 Excel）和
                    AgentFieldExtractor.segPlanToTableValue（生成报告）保持一致 ——
                    三处是同一张表的三个出口，加列要一起加。
                    注：「垂深」是簇级属性（取自地质设计压裂点参数表 TVD，落 COMM_WB_POR_ROW.TVD），
                    SEG_PLAN 表本身没有这一列，所以这里按簇取值，每簇一个垂深。
                  -->
                  <div class="pa-table-wrap">
                    <div class="pa-table-title">
                      <span><i class="el-icon-s-grid"></i> 表 1　分段射孔方案</span>
                      <span class="pa-table-title__right">
                        <span class="pa-table-title__hint">按射孔簇明细，共 {{ segPlanRows.length }} 簇 / {{ segPlanSegments.length }} 段</span>
                        <!--
                          保存按钮放在表头，与「导出 Excel」并列：
                          原先只在页面底部工具栏有一份，而表格区是独立滚动容器
                          （.pa-result__body 高度撑满），用户在表格里改完值往上看，
                          根本看不到底部工具栏 —— 用户反馈「没有保存按钮」就是这个原因。
                          表头跟随表格一起滚动、永远在第一眼位置，所以这里再放一份。
                        -->
                        <el-button
                          size="mini"
                          :type="hasDraftEdits ? 'warning' : (isSaved ? 'success' : 'primary')"
                          :icon="hasDraftEdits ? 'el-icon-folder-checked' : (isSaved ? 'el-icon-check' : 'el-icon-folder-add')"
                          :loading="saving"
                          class="pa-table-title__save"
                          @click="saveTables"
                        >{{ saveButtonText }}</el-button>
                        <el-button
                          size="mini"
                          type="primary"
                          plain
                          icon="el-icon-download"
                          class="pa-table-title__export"
                          @click="exportSingle('segPlan')"
                        >导出 Excel</el-button>
                      </span>
                    </div>
                    <div class="pa-sheet">
                      <table class="pa-sheet__table">
                        <colgroup>
                          <!-- 分段 分簇 顶深 底深 厚度 簇间距 垂深 封隔器 接箍 方向 方式（11 列） -->
                          <col style="width:76px" /><col style="width:56px" />
                          <col style="width:88px" /><col style="width:88px" />
                          <col style="width:78px" /><col style="width:104px" />
                          <col style="width:82px" />
                          <col style="width:106px" /><col style="width:106px" />
                          <col style="width:80px" /><col style="width:104px" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th rowspan="2">分段</th>
                            <th rowspan="2">分簇</th>
                            <th colspan="2">射孔井段（m）</th>
                            <th rowspan="2">厚度（m）</th>
                            <th rowspan="2">簇（段）间距（m）</th>
                            <th rowspan="2">垂深（m）</th>
                            <th rowspan="2">封隔器位置（m）</th>
                            <th rowspan="2">套管接箍位置</th>
                            <th rowspan="2">射孔方向</th>
                            <th rowspan="2">射孔方式</th>
                          </tr>
                          <tr>
                            <th>顶深</th>
                            <th>底深</th>
                          </tr>
                        </thead>
                        <tbody>
                          <!--
                            全部单元格可编辑：改完点左下「保存」即入库，
                            报告生成时读的就是这份结构化表（COMM_WB_POR_*）。
                            el-input 用 borderless 风格贴进单元格，视觉上仍是表格。
                          -->
                          <tr v-for="(r, i) in segPlanRows" :key="'sp' + i" :class="rowClassName({ row: r })">
                            <td class="is-center is-ro">{{ stageText(r.stageNo) }}</td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.clusterNo"
                                @input="onCellEdit('seg', i, 'clusterNo', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.topMD"
                                @input="onCellEdit('seg', i, 'topMD', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.bottomMD"
                                @input="onCellEdit('seg', i, 'bottomMD', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.thickness"
                                @input="onCellEdit('seg', i, 'thickness', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.clusterSpacing"
                                placeholder="/"
                                @input="onCellEdit('seg', i, 'clusterSpacing', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.tvd"
                                @input="onCellEdit('seg', i, 'tvd', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.packerPosition"
                                placeholder="/"
                                @input="onCellEdit('seg', i, 'packerPosition', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.casingCollar"
                                @input="onCellEdit('seg', i, 'casingCollar', $event)"
                              />
                            </td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.perforationDirection"
                                @input="onCellEdit('seg', i, 'perforationDirection', $event)"
                              />
                            </td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.perforationType"
                                @input="onCellEdit('seg', i, 'perforationType', $event)"
                              />
                            </td>
                          </tr>
                          <tr v-if="!segPlanRows.length">
                            <td colspan="11" class="pa-sheet__empty">暂无数据</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </el-tab-pane>

                <!--
                  「（3）计算煤岩破碎指数」在业务上是「一图一表」，
                  但并排塞进同一个标签页时，6 道图（478px）+ 表 2（最多 420px）
                  会超出结果区可视高度，用户要滚动才能看到表 2。
                  这里把图、表拆成两个标签页：一次只渲染一块内容，
                  各自完整落在可视区内，编号上就用「图 1」「表 2」区分子项。
                -->
                <el-tab-pane name="crushChart">
                  <span slot="label">
                    <i class="el-icon-data-line"></i> （3）煤岩破碎指数图
                    <el-badge :value="crushChartTracks.length" type="info" class="pa-tab-badge" />
                  </span>
                  <!--
                    图 1：煤岩破碎指数多道曲线图（参考「图片1」的测井多道图样式）。
                    样式要点：浅灰底 + 横向浅网格线、左侧横排道名、细线体、
                    青色参考线横向拉满、无外框，多个道纵向堆叠共用一条深度横轴。
                  -->
                  <div v-if="crushChartTracks.length || crushChartUpload" class="pa-crush-chart pa-crush-chart--solo">
                    <!--
                      标题条与表 1 / 表 2 的 `.pa-table-title` 保持同一套结构与视觉
                      （橙色左边框 + 标题 + 右侧提示 + 并排按钮），
                      这样三个页签的第一眼位置和按钮位置都统一，用户不用换一套心智。

                      按钮语义（2026-11-14 起「图改为上传」）：
                        · 上传图片：选本地图片 → 走工作台文档上传归档 → 页面显示这张图
                        · 下载图片：当前显示的是上传图就存原图；是自动图就导出 canvas
                        · 保存到文档中心：把当前显示的图归档到本井（自动图才需要，上传图已归档）
                        · 查看自动图 / 查看上传图：两者都有时互相切换
                    -->
                    <div class="pa-table-title">
                      <span>
                        <i class="el-icon-data-line"></i>
                        图 1　煤岩破碎指数多道曲线
                        <span v-if="showUploadedChart" class="pa-chart-mode">（已上传图片）</span>
                        <span v-else class="pa-chart-mode pa-chart-mode--auto">（系统自动生成）</span>
                      </span>
                      <span class="pa-table-title__right">
                        <span v-if="showUploadedChart" class="pa-table-title__hint">
                          当前显示：{{ crushChartUpload.fileName || '上传图片' }}
                        </span>
                        <span v-else class="pa-table-title__hint">
                          深度 {{ fmtNum(crushChartRange.mdMin, 0) }} ~ {{ fmtNum(crushChartRange.mdMax, 0) }} m
                          <template v-if="crushRangeIsPerf">（射孔井段）</template>
                          · {{ crushChartTracks.length }} 道
                          <template v-if="crushFlatTrackCount">· {{ crushFlatTrackCount }} 道恒值</template>
                        </span>
                        <!-- 切换：两者都存在时才给 -->
                        <el-button
                          v-if="crushChartUpload && crushChartTracks.length"
                          size="mini"
                          plain
                          icon="el-icon-sort"
                          @click="crushChartShowAuto = !crushChartShowAuto"
                        >{{ showUploadedChart ? '查看自动图' : '查看上传图' }}</el-button>
                        <el-button
                          size="mini"
                          type="warning"
                          plain
                          icon="el-icon-upload2"
                          :loading="crushChartUploading"
                          @click="pickCrushChartImage"
                        >{{ crushChartUpload ? '重新上传' : '上传图片' }}</el-button>
                        <!--
                          只有真的传过图才给「移除」：用户传错文件后想彻底回到
                          系统自动图，光有「查看自动图」是不够的 —— 那只切换显示，
                          库里/待保存的 docId 还在，一点保存又挂上去了。
                        -->
                        <el-button
                          v-if="crushChartUpload"
                          size="mini"
                          type="danger"
                          plain
                          icon="el-icon-delete"
                          @click="removeCrushChartUpload"
                        >移除图片</el-button>
                        <el-button
                          size="mini"
                          type="primary"
                          plain
                          icon="el-icon-download"
                          class="pa-table-title__export"
                          :loading="chartSaving"
                          @click="exportCrushChartImage"
                        >下载图片</el-button>
                        <el-button
                          v-if="!showUploadedChart"
                          size="mini"
                          type="success"
                          plain
                          icon="el-icon-folder-checked"
                          class="pa-table-title__save"
                          :loading="chartSaving"
                          @click="saveCrushChartToDocCenter"
                        >保存到文档中心</el-button>
                      </span>
                    </div>
                    <!--
                      图表主体两种来源互斥：
                        · 上传图：直接 <img> 显示，**不能**再挂 canvas ——
                          renderCrushChart() 里 `this.$refs.crushChartCanvas` 为
                          undefined 会直接 return，看着像「图没了」；
                          hover 提示也只在 canvas 有意义，图片上不给。
                        · 自动图：原来的 canvas + hover 完全保留（代码零改动）。
                    -->
                    <div v-if="showUploadedChart" class="pa-crush-chart__canvas-box pa-crush-chart__canvas-box--img">
                      <img
                        class="pa-crush-chart__uploaded"
                        :src="crushChartUpload.url"
                        :alt="crushChartUpload.fileName || '煤岩破碎指数图'"
                      />
                    </div>
                    <div v-else class="pa-crush-chart__canvas-box">
                      <canvas
                        ref="crushChartCanvas"
                        class="pa-crush-chart__canvas"
                        @mousemove="onCrushChartHover"
                        @mouseleave="onCrushChartLeave"
                      />
                      <div
                        v-if="crushHover"
                        class="pa-crush-chart__tip"
                        :style="{ left: crushHover.x + 'px', top: crushHover.y + 'px' }"
                      >
                        <div class="pa-crush-chart__tip-md">深度 {{ fmtNum(crushHover.md, 1) }} m</div>
                        <div v-for="(it, i) in crushHover.items" :key="i" class="pa-crush-chart__tip-row">
                          <span class="pa-crush-chart__tip-dot" :style="{ background: it.color }"></span>
                          <span class="pa-crush-chart__tip-name">{{ it.label }}</span>
                          <span class="pa-crush-chart__tip-val">{{ it.text }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!--
                    空状态（既没有曲线、也没有上传图片）必须给可操作入口：
                    结构化表只存数值列，回填的「已保存版本」天然没有曲线，
                    用户切到这里会看到一张空图。光说「无数据」会让人不知所措，
                    所以两个按钮都留着 —— 重新解析曲线 / 直接上传一张图。
                  -->
                  <div v-else class="pa-crush-empty">
                    <el-empty :image-size="70" description="暂无破碎指数图（可上传图片，或重新解析曲线后由系统绘制）" />
                    <div class="pa-crush-empty__btns">
                      <el-button
                        size="mini"
                        type="warning"
                        icon="el-icon-upload2"
                        :loading="crushChartUploading"
                        @click="pickCrushChartImage"
                      >上传图片</el-button>
                      <el-button
                        size="mini"
                        type="primary"
                        icon="el-icon-refresh"
                        :loading="curvesFetching"
                        @click="ensureCurves().then(() => $nextTick(() => renderCrushChart()))"
                      >重新解析曲线数据</el-button>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane name="crushIdx">
                  <span slot="label">
                    <i class="el-icon-s-grid"></i> （3）煤岩破碎指数表
                    <el-badge :value="crushIdxRows.length" type="warning" class="pa-tab-badge" />
                  </span>
                  <!--
                    表 2 严格对齐《压裂工程设计》模板「（3）计算煤岩破碎指数」表：
                      ┌──────┬──────┬─────────────┬────────────────┬──────────────┬────────┬────────┐
                      │ 分段 │ 分簇 │ 射孔井段(m) │ 煤岩破碎指数   │ 孔密（孔/m） │ 射孔枪 │ 射孔弹 │
                      │      │      ├──────┬──────┤                │              │        │        │
                      │      │      │ 顶深 │ 底深 │                │              │        │        │
                      └──────┴──────┴──────┴──────┴────────────────┴──────────────┴────────┴────────┘
                    共 8 列，两行表头 + 合并单元格，与模板一模一样。
                  -->
                  <div class="pa-table-wrap">
                    <div class="pa-table-title">
                      <span><i class="el-icon-s-grid"></i> 表 2　煤岩破碎指数</span>
                      <span class="pa-table-title__right">
                        <span class="pa-table-title__hint">
                          按射孔簇明细，共 {{ crushIdxRows.length }} 簇
                          <span class="pa-table-title__note">（破碎指数口径：等于 MSE 值）</span>
                        </span>
                        <el-button
                          size="mini"
                          :type="hasDraftEdits ? 'warning' : (isSaved ? 'success' : 'primary')"
                          :icon="hasDraftEdits ? 'el-icon-folder-checked' : (isSaved ? 'el-icon-check' : 'el-icon-folder-add')"
                          :loading="saving"
                          class="pa-table-title__save"
                          @click="saveTables"
                        >{{ saveButtonText }}</el-button>
                        <el-button
                          size="mini"
                          type="primary"
                          plain
                          icon="el-icon-download"
                          class="pa-table-title__export"
                          @click="exportSingle('crushIdx')"
                        >导出 Excel</el-button>
                      </span>
                    </div>
                    <div class="pa-sheet">
                      <table class="pa-sheet__table">
                        <colgroup>
                          <col style="width:76px" /><col style="width:56px" />
                          <col style="width:92px" /><col style="width:92px" />
                          <col style="width:124px" /><col style="width:100px" />
                          <col style="width:92px" /><col style="width:100px" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th rowspan="2">分段</th>
                            <th rowspan="2">分簇</th>
                            <th colspan="2">射孔井段（m）</th>
                            <th rowspan="2">煤岩破碎指数</th>
                            <th rowspan="2">孔密（孔/m）</th>
                            <th rowspan="2">射孔枪</th>
                            <th rowspan="2">射孔弹</th>
                          </tr>
                          <tr>
                            <th>顶深</th>
                            <th>底深</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(r, i) in crushIdxRows" :key="'ci' + i" :class="crushRowClassName({ row: r })">
                            <td class="is-center is-ro">{{ stageText(r.stageNo, 'arabic') }}</td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.clusterNo"
                                @input="onCellEdit('crush', i, 'clusterNo', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.topMD"
                                @input="onCellEdit('crush', i, 'topMD', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.bottomMD"
                                @input="onCellEdit('crush', i, 'bottomMD', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell pa-cell--idx"
                                :value="r.crushIndex"
                                @input="onCellEdit('crush', i, 'crushIndex', $event)"
                              />
                            </td>
                            <td class="is-num">
                              <el-input
                                class="pa-cell"
                                :value="r.holeDensity != null ? r.holeDensity : 16"
                                @input="onCellEdit('crush', i, 'holeDensity', $event)"
                              />
                            </td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.gunType || '89枪'"
                                @input="onCellEdit('crush', i, 'gunType', $event)"
                              />
                            </td>
                            <td class="is-center">
                              <el-input
                                class="pa-cell"
                                :value="r.chargeType || '深穿透'"
                                @input="onCellEdit('crush', i, 'chargeType', $event)"
                              />
                            </td>
                          </tr>
                          <tr v-if="!crushIdxRows.length">
                            <td colspan="8" class="pa-sheet__empty">暂无数据</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>

              <!-- 调整汇总 + 操作 -->
              <div class="pa-result__footer">
                <div class="pa-summary">
                  <!--
                    三类互斥，相加恒等于总段数（见 adjustStats 注释）。
                    同时被 MSE 和接箍调整过的段只计入 MSE 这一块，用括号单独说明，
                    否则用户按「9 段怎么算出 15」去核对会发现对不上。
                  -->
                  <span class="pa-summary__dot pa-summary__dot--blue"></span> 未调整 {{ adjustStats.normal }}
                  <span class="pa-summary__dot pa-summary__dot--yellow"></span> MSE优化 {{ adjustStats.mse }}
                  <span class="pa-summary__dot pa-summary__dot--red"></span> 避让 {{ adjustStats.packer }}
                  <span v-if="adjustStats.both > 0" class="pa-summary__both">
                    （其中 {{ adjustStats.both }} 段同时做过 MSE 与接箍调整）
                  </span>
                  <span class="pa-summary__total">共 {{ adjustStats.total }} 段</span>
                  <span v-if="savedInfo" class="pa-saved-tip">
                    <i class="el-icon-check"></i> {{ savedInfo }}
                  </span>
                </div>
                <div class="pa-result__buttons">
                  <!-- 有未保存改动时给个角标，避免用户改完表格忘了点保存 -->
                  <el-badge :is-dot="hasDraftEdits" class="pa-save-badge">
                    <el-button
                      size="small"
                      :type="hasDraftEdits ? 'warning' : (isSaved ? 'success' : 'primary')"
                      :icon="hasDraftEdits ? 'el-icon-folder-checked' : (isSaved ? 'el-icon-check' : 'el-icon-folder-add')"
                      :loading="saving"
                      @click="saveTables"
                    >{{ saveButtonText }}</el-button>
                  </el-badge>
                  <el-dropdown size="small" trigger="click" @command="downloadTable">
                    <el-button size="small" icon="el-icon-download">
                      下载<i class="el-icon-arrow-down el-icon--right"></i>
                    </el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item command="xlsx">
                        <i class="el-icon-document"></i> Excel（两张表）
                      </el-dropdown-item>
                      <el-dropdown-item command="docx">
                        <i class="el-icon-document-add"></i> Word（可插文档）
                      </el-dropdown-item>
                      <el-dropdown-item command="csv">
                        <i class="el-icon-tickets"></i> CSV
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                  <el-button size="small" icon="el-icon-document-copy" @click="copyData">复制数据</el-button>
                </div>
              </div>
            </template>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { getAttachments } from '@/api/workbench'
import { generatePerforationStream, fetchPerforationCurves } from '@/api/perforation-agent'
import {
  savePerforationTables,
  getCurrentPerforationTables,
  perforationTableDownloadUrl
} from '@/api/perforation-table'
import { listWellDocs, downloadWellDoc, uploadWellDoc, previewWellDoc } from '@/api/wellDoc'

export default {
  name: 'PerforationAgentPage',
  data() {
    return {
      wbWellId: '',
      wellName: '',
      selectedWellId: '',
      wellOptions: [],

      // 附件勾选
      useMse: false,
      useCasingCollar: false,
      useTotalHc: false,
      useGamma: false,

      // 设计文档（源文档）
      useDesignDoc: true,
      designDoc: null,          // 文档中心返回的元数据（有 fileId，可下载）
      designDocFile: null,      // 本地临时选择的 File（优先级高于 designDoc）

      // 曲线材料（与后端 curveFiles 下标一一对应，顺序不能改）
      mseAttachment: null,          // curveFiles[0]
      casingCollarAttachment: null, // curveFiles[1]
      totalHcAttachment: null,      // curveFiles[2]
      gammaAttachment: null,        // curveFiles[3]

      attLoading: false,        // 是否正在从工作台检索材料
      attScanned: false,        // 是否已完成一次检索
      attCount: 0,              // 本井在工作台收集到的附件总数

      // 参数
      params: {
        avoidDistance: 2,
        mseThreshold: 10,
        maxShift: 5,
        perforationMethod: '全程固井'
      },

      // 生成状态
      running: false,
      generatingText: '正在生成射孔方案…',
      result: null,

      /*
       * 自动生成（进页面即出 2 表 1 图）。
       *
       * 记录已经为哪口井自动跑过，用于「一次进入只自动生成一次」：
       *   - 用户手动点「开始生成」后又被 watch/轮询触发 → 拦截；
       *   - 换井（wellId 变了）→ 允许对新井再自动跑一次。
       * 不放在 result 上判断，因为 result 可能来自「回填已保存版本」，
       * 那种情况下也不该再自动生成。
       */
      autoGenWellId: '',
      autoGenTried: false,      // 本井是否已尝试过自动生成（含失败，避免失败后死循环重试）
      curvesFetching: false,    // 是否正在补取曲线（回填旧版本后图 tab 需要）
      /*
       * 图 1 的「下载图片 / 保存到文档中心」共用一个 loading 标志。
       *
       * 不复用 saving：saving 的语义是「结构化表入库」（COMM_WB_POR_*），
       * 和图导出是两条完全独立的链路。共用会让用户在保存表格时看到图的按钮
       * 也在转圈，或反过来 —— 那个假状态会让人以为另一件事也卡住了。
       */
      chartSaving: false,

      /*
       * 「（3）煤岩破碎指数图」改为用户上传（2026-11-14 业务要求）。
       *
       * 交互口径：
       *   - 系统仍会自动绘制多道曲线图（crushChartTracks 有值就画），代码完全保留；
       *   - 只要用户上传过图片，图表区就改为显示这张图片，自动图可一键切回；
       *   - 上传的图片随「保存修改」一起入库（表头 CRUSH_CHART_DOC_ID），
       *     重新进页面自动回填，不需要再传一次。
       *
       * crushChartUpload 结构：{ docId, fileName, url }
       *   url 是 preview 接口拉回来的 blob 转 objectURL —— preview 要带
       *   Authorization 头，直接塞给 <img src> 会 401。
       *   换图/清空时必须 revokeObjectURL，否则每次切换泄漏一份内存。
       */
      crushChartUpload: null,
      crushChartUploading: false,
      // 用户手动选了「看自动图」时为 true（仅当已有上传图片时有效）
      crushChartShowAuto: false,
      // 回填老数据时库里的 fileName 可能为空 → 借 preview 响应的 X-File-Name 兜底
      _crushChartRemoteName: '',

      // 保存与下载
      saving: false,           // 保存中
      savedInfo: '',           // 「已保存 第N版」提示文案
      savedTableId: '',        // 最近一次保存的表头 ID（下载单表时用）
      savedWbWellId: '',       // 保存时对应的井，切换井后要清空下载引用

      /*
       * 两张表的「可编辑草稿」。
       *
       * 页面单元格直接 v-model 绑到草稿上，用户改一格就写进草稿；
       * 草稿为空表示「没改过」，此时渲染与保存都用基准数据
       * （generated / 回填的已保存版本）。
       *
       * 清空时机：重新生成、换井、保存成功（保存后草稿内容已入库，
       * 清掉让渲染回到基准，避免两份数据长期并存各自漂移）。
       */
      segDraft: null,
      crushDraft: null,

      // 结果区标签页（3 个，对应「2 表 1 图」）：
      //   segPlan     → 表 1　分段射孔方案计算
      //   crushChart  → 图 1　煤岩破碎指数多道曲线
      //   crushIdx    → 表 2　煤岩破碎指数
      // 默认停在「表 1」，因为用户最常看的是分段方案。
      resultTab: 'segPlan',

      // 煤岩破碎指数多道图（参考「图片1」测井多道图样式）
      crushHover: null           // { x, y, md, items: [{label, color, text}] }
    }
  },

  computed: {
    /**
     * 曲线材料清单。
     * 顺序与后端 PerforationDesignAgent.generate() 的 curveFiles 形参顺序严格一致
     * （0=MSE、1=套管接箍、2=全烃、3=伽马），改动会导致曲线错位。
     */
    curveItems() {
      return [
        { key: 'MSE', useKey: 'mse', label: 'MSE曲线（机械比能）', attachment: this.mseAttachment },
        { key: 'CASING_COLLAR', useKey: 'collar', label: '套管接箍', attachment: this.casingCollarAttachment },
        { key: 'TOTAL_HC', useKey: 'hc', label: '全烃值', attachment: this.totalHcAttachment },
        { key: 'GAMMA', useKey: 'gamma', label: '伽马曲线', attachment: this.gammaAttachment }
      ]
    },

    /** 各曲线是否参与计算（与 useFlags 双向绑定） */
    useFlags: {
      get() {
        return {
          mse: this.useMse,
          collar: this.useCasingCollar,
          hc: this.useTotalHc,
          gamma: this.useGamma
        }
      },
      set(v) {
        this.useMse = !!v.mse
        this.useCasingCollar = !!v.collar
        this.useTotalHc = !!v.hc
        this.useGamma = !!v.gamma
      }
    },

    /** 自动带入情况说明 */
    autoFillTip() {
      if (!this.attScanned) return ''
      if (this.wbWellId && !this.attCount) {
        return '本井暂未在工作台收集材料，请先到单井工作台对应模块上传'
      }
      const got = this.curveItems.filter(i => i.attachment).length
      if (!got) return '工作台未找到曲线类材料（MSE / 接箍 / 全烃 / 伽马）'
      const names = this.curveItems.filter(i => i.attachment).map(i => i.label.split('（')[0])
      return `已自动带入 ${got} 项：${names.join('、')}`
    },

    /** 设计文档来源：本地临时文件优先，其次文档中心 */
    designDocSource() {
      if (this.designDocFile) {
        return { type: 'local', name: this.designDocFile.name }
      }
      if (this.designDoc) {
        return { type: 'docCenter', name: this.designDoc.fileName, fileId: this.designDoc.fileId }
      }
      return null
    },

    /**
     * 必填材料是否齐全 —— 自动生成的触发条件。
     *
     * 与截图里模块卡片的「必填材料」口径一致，只看三项：
     *   MSE 曲线 / 套管接箍数据 / 全烃值数据。
     * 伽马（GAMMA）与设计文档是选填：有就参与计算，没有不影响出表。
     */
    requiredReady() {
      const got = [this.mseAttachment, this.casingCollarAttachment, this.totalHcAttachment]
        .filter(a => !!(a && a.filePath)).length
      return got === 3
    },

    /** 必填材料收集进度，用于空状态/提示文案 */
    requiredProgress() {
      const items = this.curveItems.filter(i => i.key !== 'GAMMA')
      const got = items.filter(i => i.attachment).length
      return { got, total: items.length }
    },

    designDocTagText() {
      return this.designDocFile ? '本地文件' : '文档中心'
    },

    designDocHint() {
      if (this.designDocFile) {
        return '使用本地文件，不依赖文档中心'
      }
      if (this.designDoc) {
        return '已从文档中心读取，可改用本地文件'
      }
      return '文档中心未找到，请本地选择（docx/doc/xlsx）'
    },

    /**
     * 调整统计（三类互斥，三项之和恒等于总段数）。
     *
     * <p>🔴 不能写成三个独立 filter。段上的 `mseAdjusted` 与 `packerAdjusted`
     * 不是互斥标记 —— 一个段完全可能既被 MSE 优选挪过位置、又被接箍挤过封隔器
     * （实测「安13-7-3平3」9 段：mse=9、packer=6，若各自 filter 相加是 15 段，
     * 而全井只有 9 段）。用户一眼就能看出数字对不上，进而怀疑整张表算错了。
     *
     * <p>因此按「优先级归类」：先归 MSE（主动优选，更该被看见），
     * 剩下的再归避让，最后才是未调整。这样三块相加永远等于段数。
     */
    adjustStats() {
      if (!this.result || !this.result.segments) {
        return { normal: 0, mse: 0, packer: 0, total: 0, both: 0 }
      }
      const segs = this.result.segments
      let mse = 0, packer = 0, normal = 0, both = 0
      segs.forEach(s => {
        if (s.mseAdjusted) {
          mse++
          // 同时被接箍调整过：计入 MSE，但单独记一次，供文案侧面说明
          if (s.packerAdjusted) both++
        } else if (s.packerAdjusted) {
          packer++
        } else {
          normal++
        }
      })
      return { normal, mse, packer, total: segs.length, both }
    },

    /**
     * 表 1 基准数据：分段射孔方案（按簇）。
     *
     * 优先用后端下发的 segPlan（字段名与保存接口完全一致）；
     * 老版本后端没有该字段时，从 segments 兜底映射一次，
     * 保证「生成→保存→下载」在前后端版本错位时也不会空表。
     *
     * ⚠️ 这是「不可变基准」，页面渲染与保存都用 segPlanRows（草稿优先），
     * 不要直接改这个 —— computed 改不动，改了也会被下次求值覆盖。
     */
    segPlanBase() {
      if (!this.result) return []
      const crush = Array.isArray(this.result.crushIdx) ? this.result.crushIdx : []
      const segs = this.segPlanSegments

      // 模板「（2）分段射孔方案」表是「一簇一行」：分段 | 分簇 | 顶深 | 底深 | ...
      // 所以段信息（间距/封隔器/方式）按段回填到每个簇上。
      if (crush.length) {
        const byStage = {}
        segs.forEach(s => { byStage[s.stageNo] = s })
        // 空值判定用「null/undefined/空串」，不能用 || —— 0 和 0.0 是合法深度值
        const pick = (a, b, dft) => {
          if (a !== null && a !== undefined && a !== '') return a
          if (b !== null && b !== undefined && b !== '') return b
          return dft
        }
        return crush.map(c => {
          const s = byStage[c.stageNo] || {}
          /*
           * 簇（段）间距（m）—— 业务是「一簇一行」逐行填（2026-11-15 第三次修订）：
           *   全表第 1 簇（最浅）→ 「/」（null）
           *   之后每一行         → |上一簇的顶深 − 本簇的底深|（跨段滚动）
           *
           * 后端已按逐簇口径算好，crushIdx 每行都带自己的 clusterSpacing。
           * 优先取簇级值；没有（旧后端 / 历史落库）时回落到段级单值。
           *
           * ⚠️ 不能直接用 s.clusterSpacing 铺满整段 —— 逐簇口径下同段各簇值不同，
           *   段级单值会把第 1 簇的「/」和第 2 簇的公式值压成同一个。
           * ⚠️ null 保持 null，「/」由输入框 placeholder 显示（见模板 341 行）。
           */
          const clusterSpacing = c.clusterSpacing !== undefined && c.clusterSpacing !== null
            ? c.clusterSpacing
            : s.clusterSpacing
          return {
            stageNo: c.stageNo,
            clusterNo: c.clusterNo,
            topMD: c.topMD,
            bottomMD: c.bottomMD,
            /*
             * 厚度（m）—— <b>簇级</b>口径：单簇段 2m，多簇段每簇 1m。
             *
             * 口径（2026-11-15 二次修订，业务最新原话）：
             *   「厚度：当前段如果只有1簇 底深等于2 如果是2簇 底深等于1」
             *   即底深 = 顶深 + 厚度，所以这一列就是每簇自己的射开厚度。
             *
             * ⚠️ 此前一度改成「本段最大顶深 − 最小底深」（段跨度），
             *   已被业务否定 —— 跨度是两簇之间的空白，不是厚度。
             *   现在表 1 与表 2 这一列同源同义（都取 c.thickness）。
             */
            thickness: pick(c.thickness, s.perforationLength, ''),
            // 垂深是按簇落的（COMM_WB_POR_ROW.TVD），SEG_PLAN 无此列
            tvd: pick(c.tvd, s.tvd, ''),
            clusterSpacing,
            stageSpacing: s.stageSpacing,
            /*
             * 封隔器位置（m）—— 段级口径（2026-11-15 第三次修订，业务原话）：
             *   「封隔器位置（m）：第一段空着 后面每段的封隔器位置值等于每段的最大顶深+20」
             *
             * 后端 PackerPositionCalculator 已按「本段最大顶深 + 20」算好并回填到
             * 该段每一簇上（段级同值），第一段是 null。这里直接取簇级值即可，
             * 不要自己再算一遍 —— 后端那侧还要做「避让套管接箍 2m」的调整。
             *
             * null 保持 null，「/」由输入框的 placeholder 显示（见模板）。
             * 不能把 '/' 写进 value：它会被 onCellEdit 当作用户输入，
             * 转 Number 不成立 → 落库变 null，看着一样实则把占位符变成了脏值。
             */
            packerPosition: c.packerPosition,
            // 接箍按簇落库（COMM_WB_POR_ROW.CASING_COLLAR），簇级优先、段级回落。
            // 兜底用 null 不用 ''：这列是数值列，空串进 CLUSTER_FIELDS 合并后
            // 会被当成「有值」原样提交给后端 Double 字段，反序列化时变成 null，
            // 页面显示也变成空白而不是「/」。
            casingCollar: pick(c.casingCollar, s.casingCollar, null),
          perforationDirection: pick(s.perforationDirection, c.perforationDirection, '水平'),
          /*
           * 射孔方式（2026-11-16）：后端按「模板 + 段号」二元下发
           *   全程固井 → 首段「油管传输」/ 其余「电缆输送」
           *   滑套压裂 → 首段「滑套开启后压裂」/ 其余「电缆输送」
           *   半程固井 → 全部「电缆输送」
           * 簇级值优先（crushIdx 逐行带），段级回落给旧后端兜底。
           * 兜底 '' 而不是模板名 —— 宁可空着让用户填，也不要再出现
           * 整列都是「全程固井」这种把模板名当结果值的错。
           */
          perforationType: pick(c.perforationType, s.perforationType, ''),
            mseAdjusted: c.mseAdjusted,
            packerAdjusted: c.packerAdjusted,
            remark: pick(c.remark, s.remark, '')
          }
        })
      }

      /*
       * 兜底：后端只给了段级数据时，仍按段出表（一簇一行退化为一段一行）。
       *
       * thickness —— 2026-11-15 二次修订后回到<b>簇级</b>口径：
       * 单簇段 2、多簇段每簇 1。这里一段只有一行（不知道簇数明细），
       * 直接用段级 perforationLength（后端已按「Σ 各簇厚度」算好 = 通常 2）。
       */
      return segs.map(s => {
        const len = s.perforationLength === null || s.perforationLength === undefined || s.perforationLength === ''
          ? ''
          : s.perforationLength
        return {
          stageNo: s.stageNo,
          clusterNo: 1,
          topMD: s.startDepth,
          bottomMD: s.endDepth,
          thickness: len,
          tvd: s.tvd || '',
          /*
           * 逐簇口径（2026-11-15 第三次修订）：这里没有簇明细，
           * 只能退化成段级值；null 交给 placeholder 显示「/」。
           * 没有簇明细时「第一段第 1 簇 = /」靠段级值本就是 null 来体现。
           */
          clusterSpacing: s.clusterSpacing,
          stageSpacing: s.stageSpacing,
          packerPosition: s.packerPosition,
          casingCollar: s.casingCollar == null ? null : s.casingCollar,
          perforationDirection: s.perforationDirection || '水平',
          perforationType: s.perforationType || '',
          mseAdjusted: s.mseAdjusted,
          packerAdjusted: s.packerAdjusted,
          remark: s.remark
        }
      })
    },

    /**
     * 段级汇总（表 1 需要按段取的间距/封隔器/方式，从 segPlan 或 segments 归一化）。
     */
    segPlanSegments() {
      if (!this.result) return []
      if (Array.isArray(this.result.segPlan) && this.result.segPlan.length) {
        return this.result.segPlan.map(s => ({
          stageNo: s.stageNo,
          startDepth: s.startDepth,
          endDepth: s.endDepth,
          perforationLength: s.perforationLength,
          clusters: s.clusters,
          clusterSpacing: s.clusterSpacing,
          clusterSpacingList: s.clusterSpacingList,
          stageSpacing: s.stageSpacing,
          packerPosition: s.packerPosition,
          casingCollar: s.casingCollar,
          perforationDirection: s.perforationDirection,
          perforationType: s.perforationType,
          mseAdjusted: s.mseAdjusted,
          packerAdjusted: s.packerAdjusted,
          remark: s.remark
        }))
      }
      const segs = this.result.segments || []
      return segs.map(s => ({
        stageNo: s.segmentNo,
        startDepth: s.startDepth,
        endDepth: s.endDepth,
        perforationLength: s.perforationLength,
        clusters: s.clusters,
        clusterSpacing: s.clusterSpacing,
        clusterSpacingList: s.clusterSpacingList,
        stageSpacing: s.stageSpacing,
        packerPosition: s.packerPosition,
        casingCollar: s.casingCollar,
        perforationDirection: s.perforationDirection,
        perforationType: s.perforationType,
        mseAdjusted: s.mseAdjusted,
        packerAdjusted: s.packerAdjusted,
        remark: s.remark
      }))
    },

    /**
     * 表 2 基准数据：煤岩破碎指数（按簇）。
     *
     * 同样优先用后端下发的 crushIdx；没有时从 segments 兜底
     * （旧后端只按段给数据，兜底时每段一行，标注 clusterNo = 1）。
     *
     * ⚠️ 同 segPlanBase：这是不可变基准，渲染/保存请用 crushIdxRows。
     */
    crushIdxBase() {
      if (!this.result) return []
      if (Array.isArray(this.result.crushIdx) && this.result.crushIdx.length) {
        return this.result.crushIdx
      }
      return []
    },

    /**
     * 表 1 的「可编辑草稿」。
     *
     * 为什么要有草稿层：segPlanBase 是 computed，页面上的单元格直接绑它
     * 是改不动的（Vue 会拒绝 + 下次求值又被覆盖）。所以：
     *   - segDraft 非空时以它为准（用户在页面上改过的值）；
     *   - 为空时回落到基准数据（刚生成 / 刚回填 / 换井后清空）。
     * 保存时用这两份合并后的结果，保证「看到什么就存什么」。
     */
    segPlanRows() {
      return this.segDraft && this.segDraft.length ? this.segDraft : this.segPlanBase
    },

    /** 表 2 的可编辑草稿，逻辑同 segPlanRows */
    crushIdxRows() {
      return this.crushDraft && this.crushDraft.length ? this.crushDraft : this.crushIdxBase
    },

    /** 是否有未保存的单元格改动（用于保存按钮提示与离开提醒） */
    hasDraftEdits() {
      return !!(this.segDraft && this.segDraft.length) || !!(this.crushDraft && this.crushDraft.length)
    },

    /**
     * 当前这份结果是否**已经入库**（用于表头保存按钮的文案）。
     *
     * <p>🔴 不能只看 {@link #hasDraftEdits}。草稿为空只说明「没改过」，
     * 不代表「已经保存」—— 刚点完「重新生成」时草稿同样是空的
     * （`runGenerate` 开头就 `clearDrafts()`），但这份新算出来的结果是
     * 全新的、库里根本没有。此前按钮只看草稿，于是重新生成后表头上
     * 一直挂着绿色的「已保存」，用户以为已经落库，直接关页面就丢了。
     *
     * <p>真正的判据是「有没有保存回执」：`savedWbWellId` 与当前井一致，
     * 且 `savedTableId` 非空。这两者在三处会被清掉 ——
     * `runGenerate` 成功后（新结果未入库）、`resetSavedState()`（换井）、
     * 回填失败时。
     */
    isSaved() {
      if (!this.result) return false
      if (!this.savedTableId) return false
      // 换井后旧回执不算数（savedWbWellId 的语义就是「这条回执属于哪口井」）
      if (this.savedWbWellId && this.wbWellId && this.savedWbWellId !== this.wbWellId) return false
      return !this.hasDraftEdits
    },

    /**
     * 表头保存按钮的文案。
     *
     * 三种状态必须能区分开，否则用户无法判断「现在点保存会发生什么」：
     *   已保存   → 点它是重复保存（版本号 +1）
     *   保存修改 → 有未提交的单元格改动
     *   保存     → 结果还没入库（最常见：刚重新生成）
     */
    saveButtonText() {
      if (this.hasDraftEdits) return '保存修改'
      return this.isSaved ? '已保存' : '保存'
    },

    crushChartTracks() {
      if (!this.result) return []
      const c = this.result.curves || {}
      const tracks = []

      /** 原始曲线 → 采样点数组（去掉无效值、按 MD 升序） */
      const toPoints = arr => (arr || [])
        .filter(p => p && isFinite(p.md) && isFinite(p.value))
        .map(p => ({ md: Number(p.md), value: Number(p.value) }))
        .sort((a, b) => a.md - b.md)

      /** 是否恒值（全部采样点同值，容忍 1e-9 浮点误差） */
      const isFlat = pts => {
        if (pts.length < 2) return false
        const v0 = pts[0].value
        return pts.every(p => Math.abs(p.value - v0) < 1e-9)
      }

      // ---- 1~6 道：六条钻井参数曲线 ----
      this._drillingTrackDefs().forEach(def => {
        const pts = toPoints(c[def.src])
        if (!pts.length) return
        const track = {
          key: def.key,
          label: def.label,
          unit: def.unit,
          color: def.color,
          kind: 'line',
          points: pts,
          flat: isFlat(pts),
          flatValue: isFlat(pts) ? pts[0].value : null
        }
        if (def.useThreshold) {
          const thr = Number(this.params.mseThreshold)
          if (isFinite(thr) && thr > 0) {
            track.refLine = { value: thr, label: '阈值 ' + thr }
          }
        }
        tracks.push(track)
      })

      // ---- 7 道：汇总（按射孔段聚合的柱状） ----
      const summary = this._buildStageSummaryBars()
      if (summary.length) {
        tracks.push({
          key: 'summary',
          label: '汇总',
          unit: '',
          color: '#d64541',
          kind: 'bar',
          points: summary
        })
      }

      // ---- 8 道：总体（均值评分单线） ----
      const overall = this._buildOverallScoreCurve()
      if (overall.length) {
        tracks.push({
          key: 'overall',
          label: '总体',
          unit: '评分',
          color: '#111827',
          kind: 'line',
          points: overall,
          // 评分归一到 0~1，量程固定，方便跨井对比
          domain: [0, 1],
          refLine: { value: 0.5, label: '0.5 基准' }
        })
      }

      return tracks
    },

    /**
     * 「汇总」道：按射孔段聚合。
     *
     * 规则（与用户确认的口径）：
     *   每段取该段深度区间内各条曲线（pressure_mse / MSE / 地层应力 / 钻速 / 钻压 / 转速）
     *   的**区间均值**，各自 min-max 归一化到 0~1 后求算术平均，得到一个
     *   「该段整体指标强度」。柱状从段底画到段顶，柱子高度 = 该段评分。
     *
     * 为什么用柱状而不是曲线：段内值波动大，一根柱子更直观地表达
     * 「这一段整体好还是差」，与射孔段的划分语义也对得上。
     *
     * @returns {Array<{md:Number, bottom:Number, value:Number, stageNo, label}>}
     *          md=段顶深、bottom=段底深（与 crushIdx 行口径一致：topMD 可能大于 bottomMD，
     *          这里统一转成 lo/hi 便于绘制）
     */

    crushChartRange() {
      const pr = this.perforationRange()
      if (pr) return pr
      // 兜底：没有任何射孔数据时才用曲线并集
      let mdMin = Infinity
      let mdMax = -Infinity
      this.crushChartTracks.forEach(tr => {
        tr.points.forEach(p => {
          const lo = p.bottom != null ? Math.min(p.md, p.bottom) : p.md
          const hi = p.bottom != null ? Math.max(p.md, p.bottom) : p.md
          if (lo < mdMin) mdMin = lo
          if (hi > mdMax) mdMax = hi
        })
      })
      if (!isFinite(mdMin) || !isFinite(mdMax)) return { mdMin: 0, mdMax: 1 }
      if (mdMax - mdMin < 1) mdMax = mdMin + 1
      return { mdMin, mdMax }
    },

    /** X 轴是否锁在射孔井段（用于 header 上标注「（射孔井段）」） */
    crushRangeIsPerf() {
      // perforationRange 是 methods 里的普通方法，computed 里可以正常调用
      return !!this.perforationRange()
    },

    /** 恒值道数量（钻压/转速/地层应力在部分井是恒值，header 上提示一下） */
    crushFlatTrackCount() {
      return (this.crushChartTracks || []).filter(t => t.flat).length
    },

    /**
     * 当前是否显示「用户上传的图片」而不是系统自动绘制的曲线图。
     *
     * 判定口径（2026-11-14）：
     *   · 没有任何上传图片  → false（永远走自动图）
     *   · 有上传图片、且用户没主动切回自动图 → true（默认显示上传图）
     *   · 有上传图片、用户点了「查看自动图」 → false
     *
     * 注意 `crushChartShowAuto` 只在有上传图片时才有意义，所以这里用
     * `!!this.crushChartUpload && !this.crushChartShowAuto`，
     * 不能简化成 `!this.crushChartShowAuto` —— 否则没上传图时也会误判。
     */
    showUploadedChart() {
      return !!this.crushChartUpload && !this.crushChartShowAuto
    },
  },

  created() {
    const q = this.$route.query || {}
    this.wbWellId = q.wbWellId || ''
    this.wellName = q.wellName || ''
    if (this.wbWellId) {
      this.selectedWellId = this.wbWellId
      this.wellOptions = [{ wbWellId: this.wbWellId, wellName: this.wellName || this.wbWellId }]
    }
    // 从 URL 进来带 auto=0（例如只想看已保存版本、不想重算）时禁用自动生成
    if (String(q.auto || '') === '0') {
      this.autoGenTried = true
      this.autoGenWellId = this.wbWellId
    }
    // 兜底：从 sessionStorage 恢复井号列表
    this.restoreWellsFromSession()
    // 井号列表可能是跳转后才异步写进 sessionStorage 的（单井工作台 goPerforation
    // 先 push 再拉 /workbench/tree 缓存），短时间内再补读两次，拿到就把下拉补全
    this._wellOptTimer = [400, 1200].map(ms => setTimeout(() => {
      this.restoreWellsFromSession()
    }, ms))
    // 同步选中井，保证「返回工作台」带回正确的井库 ID 与标题
    this.syncSelectedWell()
    this.onWellChange(this.selectedWellId)
  },

  beforeDestroy() {
    ;(this._wellOptTimer || []).forEach(t => clearTimeout(t))
    this._wellOptTimer = null
  },

  methods: {
    /* ============================================================
     *  煤岩破碎指数图（8 道）用到的工具方法
     * ------------------------------------------------------------
     *  ⚠️ 这几个必须是 methods 里的普通方法，不能放 computed：
     *     computed 里写 `xxx() { ... },` 会被当成 getter，
     *     `this.xxx()` 直接抛「is not a function」→ render 崩 →
     *     页面永久停在「生成中…」，且只有一条 Vue warn，极难查。
     * ============================================================ */
    _drillingTrackDefs() {
      return [
        { key: 'pressureMse', src: 'pressureMseCurve', label: 'pressure_mse', unit: '', color: '#7c3aed' },
        { key: 'mse', src: 'mseCurve', label: 'MSE', unit: '', color: '#e8663d', useThreshold: true },
        { key: 'stress', src: 'stressCurve', label: '地层应力', unit: 'MPa', color: '#0e9f8e' },
        { key: 'rop', src: 'ropCurve', label: '钻速', unit: 'm/h', color: '#1d6fd4' },
        { key: 'wob', src: 'wobCurve', label: '钻压', unit: 'kN', color: '#b45309' },
        { key: 'rpm', src: 'rpmCurve', label: '转速', unit: 'r/min', color: '#8b5cf6' }
      ]
    },

    /**
     * 射孔井段范围：多道图 X 轴的**唯一**口径。
     *
     * 取所有射孔簇的 [min(簇顶深), max(簇底深)]。曲线文件往往覆盖整口井
     * （如本井曲线 1877~2870m，而射孔段只有 2085~2095m），若按曲线并集画，
     * 10m 的射孔段会被压成一条缝，什么都看不清 —— 所以 X 轴锁死到射孔井段。
     *
     * 兜底：没有簇数据时退回段表 startDepth~endDepth，再兜底用曲线并集。
     */

    perforationRange() {
      const rows = this.crushIdxRows || []
      let lo = Infinity
      let hi = -Infinity
      rows.forEach(r => {
        const a = Number(r.topMD)
        const b = Number(r.bottomMD)
        if (isFinite(a)) { lo = Math.min(lo, a); hi = Math.max(hi, a) }
        if (isFinite(b)) { lo = Math.min(lo, b); hi = Math.max(hi, b) }
      })
      if (!isFinite(lo) || !isFinite(hi)) {
        const segs = this.segPlanSegments || []
        segs.forEach(s => {
          const a = Number(s.startDepth)
          const b = Number(s.endDepth)
          if (isFinite(a)) { lo = Math.min(lo, a); hi = Math.max(hi, a) }
          if (isFinite(b)) { lo = Math.min(lo, b); hi = Math.max(hi, b) }
        })
      }
      if (!isFinite(lo) || !isFinite(hi)) return null
      if (hi - lo < 1e-6) { hi = lo + 1 }
      return { mdMin: lo, mdMax: hi }
    },

    /**
     * 煤岩破碎指数多道图：道定义列表（8 道）。
     *
     *   1. pressure_mse  —— 压力型 MSE
     *   2. MSE           —— 机械比能（带阈值参考线）
     *   3. 地层应力       —— MPa
     *   4. 钻速           —— m/h
     *   5. 钻压           —— kN
     *   6. 转速           —— r/min
     *   7. 汇总           —— 按射孔段聚合的柱状（每段一个综合值）
     *   8. 总体           —— 6 条曲线归一化后求均值的单线（越低越好钻）
     *
     * 每道结构：{ key, label, unit, color, kind, points, refLine, domain, flat }
     *   kind: 'line' 连续曲线 | 'cluster' 按簇色带 | 'marks' 刻度条 | 'bar' 按段柱状
     *   refLine: { value, label } 横向参考线（阈值）
     *   domain: [min, max] 固定量程；为空则按数据自适应
     *   flat: 该道全部采样点同值（恒值参数），画出来是水平线，UI 要提示
     */

    _buildStageSummaryBars() {
      if (!this.result) return []
      const segs = this.segPlanSegments || []
      const rows = this.crushIdxRows || []
      if (!segs.length || !rows.length) return []

      /*
       * 口径（用户第二轮确认）：柱高 = **该段内所有射孔簇的破碎指数算术均值**。
       *
       * 为什么不用「6 条曲线归一化均值」：
       *   那样得到的是 0~1 的无量纲分数，与表 2「煤岩破碎指数」列的数值
       *   （本井 2~8 量级）对不上，看图的人没法跟表核对。
       *
       * ⚠️ 归属判定：按**簇顶深**落进「段区间 ± 容差」，不能用中点、也不能用
       *   严格区间。实测本井 v7 数据（12 段 × 2 簇）：
       *
       *     段 1：start=2759 end=2782     ← 这是「两簇顶深之间的跨度」
       *     簇1 top=2783 bot=2782         ← 顶深比 end(2782) 还大 1
       *     簇2 top=2759 bot=2758         ← 顶深正好等于 start
       *
       *   即 segPlan 的 start/end 取的是两簇顶深的包络，而每簇自身还有
       *   1m 厚度（bot = top - 1）。于是：
       *     · 用中点（2782.5 / 2758.5）→ 两簇全部落在 [2759,2782] 之外，整道消失；
       *     · 用严格区间 → 每段只剩 1 个簇（端点那个），簇数减半；
       *     · 用「顶深 ± 容差」→ 12/12 段有柱、24/24 簇都参与，才是正确口径。
       *
       *   容差取 max(簇厚, 3m)：簇厚覆盖自身厚度，3m 兜住文档里深度取整到米的误差。
       *   不用加权：每段簇数对等（都是一段两簇），等权均值就是设计口径。
       */
      const bars = []
      segs.forEach(s => {
        const a = Number(s.startDepth)
        const b = Number(s.endDepth)
        if (!isFinite(a) || !isFinite(b)) return
        const lo = Math.min(a, b)
        const hi = Math.max(a, b)

        const vals = []
        rows.forEach(r => {
          const v = Number(r.crushIndex)
          if (!isFinite(v)) return
          const t = Number(r.topMD)
          if (!isFinite(t)) return
          const bt = Number(r.bottomMD)
          const thk = isFinite(bt) ? Math.abs(t - bt) : 0
          const tol = Math.max(thk, 3)
          if (t >= lo - tol && t <= hi + tol) vals.push(v)
        })
        if (!vals.length) return
        const mean = vals.reduce((x, y) => x + y, 0) / vals.length

        bars.push({
          md: lo,
          bottom: hi,
          value: mean,
          stageNo: s.stageNo,
          label: this.stageText(s.stageNo),
          count: vals.length // 该段实际参与平均的簇数，hover 里显示
        })
      })
      return bars
    },

    /**
     * 「总体」道：均值评分单线。
     *
     * 规则（与用户确认的口径）：
     *   在射孔井段的每个采样深度上，把 6 条曲线各自用**射孔段内**的 min-max
     *   归一化到 0~1，再求算术平均，得到一条 0~1 的评分曲线。
     *
     * 为什么归一化基准用「射孔段内」而不是全井：
     *   图只看射孔段，用段内极值才能把段内的相对差异拉开；用全井极值会把
     *   整段压成一坨。恒值曲线（本井钻压/转速/地层应力）不参与平均，
     *   否则会把评分整体拉平。
     *
     * @returns {Array<{md:Number, value:Number}>} value ∈ [0,1]
     */

    _buildOverallScoreCurve() {
      if (!this.result) return []
      const c = this.result.curves || {}
      const range = this.perforationRange()
      if (!range) return []
      const { mdMin, mdMax } = range

      const defs = this._drillingTrackDefs()
      // 射孔段内的采样点
      const seriesIn = {}
      defs.forEach(d => {
        seriesIn[d.key] = (c[d.src] || [])
          .filter(p => p && isFinite(p.md) && isFinite(p.value)
            && p.md >= mdMin - 1e-9 && p.md <= mdMax + 1e-9)
          .map(p => ({ md: Number(p.md), value: Number(p.value) }))
      })

      // 段内归一化基准；恒值曲线剔除
      const ranges = {}
      Object.keys(seriesIn).forEach(k => {
        const vals = seriesIn[k].map(p => p.value)
        if (vals.length < 2) { ranges[k] = null; return }
        const lo = Math.min.apply(null, vals)
        const hi = Math.max.apply(null, vals)
        ranges[k] = hi - lo > 1e-9 ? [lo, hi] : null
      })
      const activeKeys = Object.keys(ranges).filter(k => ranges[k])
      if (!activeKeys.length) return []

      // 以 MSE 曲线的深度为基准轴（没有则用第一条有数据的）
      const axisKey = seriesIn.mse.length ? 'mse' : activeKeys[0]
      const axis = seriesIn[axisKey]
      if (!axis.length) return []

      return axis.map(p => {
        const md = p.md
        const vals = []
        activeKeys.forEach(k => {
          // 同一深度取最近点（各曲线采样步长可能不同）
          let best = null
          let bestD = Infinity
          seriesIn[k].forEach(q => {
            const d = Math.abs(q.md - md)
            if (d < bestD) { bestD = d; best = q }
          })
          if (best) {
            const [lo, hi] = ranges[k]
            vals.push((best.value - lo) / (hi - lo))
          }
        })
        const v = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0
        return { md, value: v }
      }).sort((a, b) => a.md - b.md)
    },

    /**
     * 从 sessionStorage 恢复井号信息 —— 现在**只为纠正井名**，不再供下拉切换。
     *
     * 页面已去掉「井号选择」下拉（井号由 URL 唯一确定、不可在本页切换），
     * 但这段逻辑仍必须保留：URL 里的 wellName 有时是裸井号
     * （单井工作台 goPerforation 在 detail 未就绪时会退化成透传 wbWellId），
     * 而 sessionStorage.wbWellOptions（来自 /workbench/tree）里有真井名。
     * 不做这一步纠正，页面头部和导出文件名会显示成一串 W_xxx 的编码。
     *
     * 与当前井合并，而不是直接覆盖：
     * 当前井永远置顶，保证下拉/内部引用里能看到并选中它。
     */
    restoreWellsFromSession() {
      let list = []
      try {
        const raw = sessionStorage.getItem('wbWellOptions')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) list = parsed.filter(w => w && w.wbWellId)
        }
      } catch (e) { /* ignore */ }

      const curId = this.wbWellId
      if (curId) {
        // 缓存里的井名是权威的（来自 /workbench/tree 的 wellName）
        const cached = list.find(w => w.wbWellId === curId)
        const cachedName = cached ? String(cached.wellName || '').trim() : ''
        const nameFromQuery = String(this.wellName || '').trim()

        // 判据：query 带来的名字是不是「真名字」。裸井号（等于 wbWellId）或空都算无效，
        // 单井工作台的 goPerforation 在 detail 未就绪时会退化成透传裸井号。
        const nameIsUseful = (s) => !!s && s !== curId

        if (!cached) {
          // 当前井不在缓存里 → 补一条
          list = [{ wbWellId: curId, wellName: nameIsUseful(nameFromQuery) ? nameFromQuery : (curId) }].concat(list)
        } else if (cachedName && nameIsUseful(cachedName)) {
          // 缓存有真名 → 一律以缓存为准，并把 this.wellName 纠正过来
          cached.wellName = cachedName
          if (this.wellName !== cachedName) this.wellName = cachedName
        } else if (nameIsUseful(nameFromQuery)) {
          // 缓存里也是裸井号，但 query 带了好名字 → 用 query 的
          cached.wellName = nameFromQuery
        }
      }
      if (!list.length) return

      this.wellOptions = list
      if (!this.selectedWellId) {
        this.selectedWellId = list[0].wbWellId
        this.wbWellId = list[0].wbWellId
        this.wellName = list[0].wellName
      }
    },

    /**
     * 装载当前井的全部依赖（文档 / 曲线材料 / 已保存版本 / 自动生成）。
     *
     * ⚠️ 现在只在 created() 里调一次：页面已去掉「井号选择」下拉，
     * 井号不可在本页切换，所以这里不再承担「换井」的职责。
     * 方法名保留是为了不牵动内部的 clearAttachments / resetSavedState 调用链；
     * 若将来重新支持换井，直接把它挂回 @change 即可。
     */
    async onWellChange(wellId) {
      if (!wellId) {
        this.clearAttachments()
        this.designDoc = null
        this.designDocFile = null
        this.useDesignDoc = true
        this.attScanned = false
        this.attCount = 0
        // 换井后旧的保存引用必须清掉，否则下载会命中上一口井的表
        this.resetSavedState()
        return
      }
      const well = this.wellOptions.find(w => w.wbWellId === wellId)
      if (well) {
        this.wbWellId = well.wbWellId
        this.wellName = well.wellName
      }
      this.resetSavedState()

      // ⚠️ 换井后必须清掉上一口井的结果，否则两张表还停在旧井数据上：
      // loadSavedTables() 有意「有 result 就不回填」，不清就永远回填不了新井；
      // 更糟的是旧井表格留在屏幕上，用户以为看的是新井的射孔方案。
      this.result = null
      // 草稿也必须清：否则上一口井改过的单元格会继续显示在新井表格里，
      // 更危险的是点保存会把这批旧井的改动写进新井的版本。
      this.clearDrafts()
      this.designDocFile = null
      // 文档中心按「工作台井号」归属，必须用 wellId（= wbWellId），不能传井库 ID
      this.loadDesignDoc(this.wbWellId || wellId)

      // 同步选中井：返回单井工作台的标题/离线兜底依赖它
      this.syncSelectedWell()

      // 曲线材料：直接复用单井工作台模块卡片上传的附件，不再要求二次上传
      await this.loadAttachmentsFromWorkbench(false)
      // 已保存过的结果自动回填（不覆盖当前正在看的结果）
      const restored = await this.loadSavedTables()
      // 没有已保存版本 + 三份必填材料齐全 → 直接自动生成 2 表 1 图，
      // 用户进页面就能看到结果，不用再点「开始生成」
      if (!restored) this.maybeAutoGenerate()
    },

    /**
     * 自动生成 2 表 1 图。
     *
     * 触发条件（全部满足才自动跑）：
     *   1. 已选中井；
     *   2. 三份必填材料齐全（MSE / 套管接箍 / 全烃）；
     *   3. 当前没有结果（既没生成过，也没回填到已保存版本）；
     *   4. 不在生成中 —— 用户手动点过就不再重复；
     *   5. 本井还没自动尝试过 —— 生成失败（比如材料解析不了）只提示一次，
     *      不自动重试，避免每次进页面都报错刷屏。
     *
     * 用 wellId 而不是布尔标记，是为了「换井后对新井再自动跑一次」。
     */
    maybeAutoGenerate() {
      const wellId = this.wbWellId || this.selectedWellId
      if (!wellId) return
      if (this.result || this.running) return

      // 换井了 → 重置本井的自动生成标记
      if (this.autoGenWellId !== wellId) {
        this.autoGenWellId = wellId
        this.autoGenTried = false
      }
      if (this.autoGenTried) return
      if (!this.requiredReady) return

      this.autoGenTried = true
      // 让「自动生成」这件事对用户可见，否则表格突然出现会让人摸不着头脑
      this.$message({
        message: '必填材料已齐，正在自动生成射孔方案…',
        type: 'info',
        duration: 2000
      })
      // 放到下一个 tick：created() 里正在 await 链上，直接同步调用会打断
      // loadSavedTables 的收尾逻辑（渲染前 result 已被覆盖）
      this.$nextTick(() => { this.runGenerate({ auto: true }) })
    },

    /** 清空保存/下载状态（换井、重新生成时调用） */
    resetSavedState() {
      this.saving = false
      this.savedInfo = ''
      this.savedTableId = ''
      this.savedWbWellId = ''
    },

    /**
     * 回填该井已保存的当前版本。
     *
     * 只在「还没有生成结果」时回填，避免把用户刚生成的、尚未保存的新结果覆盖掉。
     * 拿到的 segPlan/crushIdx 结构与生成时完全一致，两张表都能直接渲染。
     *
     * @return {Promise<Boolean>} 是否成功回填（false 表示本井还没保存过 / 表未建 / 出错）
     */
    async loadSavedTables() {
      if (!this.wbWellId || this.result) return false
      try {
        const res = await getCurrentPerforationTables(this.wbWellId)
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : [])
        if (!list.length) return false

        const merged = { segments: [], segPlan: [], crushIdx: [] }
        let ver = ''
        // 煤岩破碎指数图（用户上传）的引用：两张表头都会带，取第一个非空的
        let chartDocId = ''
        let chartFileName = ''
        list.forEach(item => {
          if (!chartDocId && item.crushChartDocId) {
            chartDocId = item.crushChartDocId
            chartFileName = item.crushChartFileName || ''
          }
          if (item.tableType === 'SEG_PLAN') {
            merged.segPlan = item.segPlan || []
            ver = ver || item.versionNo
          } else if (item.tableType === 'CRUSH_IDX') {
            merged.crushIdx = item.crushIdx || []
            ver = ver || item.versionNo
          }
        })
        // 挂到 result 上：刷新页面/切井后重新渲染能读到，也让 saveTables 有值可带
        merged.crushChartDocId = chartDocId
        merged.crushChartFileName = chartFileName
        // segments 供曲线图与统计用：由 segPlan 反推（字段名不同）
        /*
         * ⚠️ 这里的字段必须与 segPlanSegments 的「segments 兜底分支」口径一致。
         * 漏掉 casingCollar / packerPosition / perforationType / perforationDirection
         * 会导致「从历史版本回填 → 表 1 接箍列整列为空 → 再保存时把空值写回库里」，
         * 一次回填就把接箍数据洗掉了（曾经实测发生过）。
         */
        merged.segments = merged.segPlan.map(r => ({
          segmentNo: r.stageNo,
          startDepth: r.startDepth,
          endDepth: r.endDepth,
          perforationLength: r.perforationLength,
          clusters: r.clusters,
          clusterSpacing: r.clusterSpacing,
          stageSpacing: r.stageSpacing,
          casingCollar: r.casingCollar,
          packerPosition: r.packerPosition,
          perforationType: r.perforationType,
          perforationDirection: r.perforationDirection,
          mseAdjusted: r.mseAdjusted,
          packerAdjusted: r.packerAdjusted,
          remark: r.remark
        }))
        if (!merged.segPlan.length && !merged.crushIdx.length) return false

        // 回填的是「已保存版本」，之前页面上未保存的随手改动一律作废：
        // 用户看到的必须与数据库里的版本一致，不能新旧值混着显示。
        this.clearDrafts()
        this.result = merged
        this.savedWbWellId = this.wbWellId
        this.savedTableId = list[0].tableId || ''
        this.savedInfo = ver ? `已保存 第 ${ver} 版（已回填）` : '已回填上次保存'
        // 回填「用户上传的破碎指数图」：有 docId 就拉预览转 objectURL，
        // 没 docId 则显式清空（避免上一口井的图串到这一口井上）
        this.restoreCrushChartFromRecord(merged)
        // 图 1 默认不在当前标签页里（默认停在表 1），隐藏容器宽度为 0，
        // 这里不必强行渲染；等用户切到「煤岩破碎指数图」时 onResultTabClick 会按真实宽度重绘。
        if (this.resultTab === 'crushChart') this.$nextTick(() => this.renderCrushChart())
        return true
      } catch (e) {
        // 回填失败不打扰用户：可能只是这张表还没建（DDL 未执行）
        console.warn('[射孔] 回填已保存表格失败', e && e.message)
        return false
      }
    },

    /** 清空曲线材料绑定 */
    clearAttachments() {
      this.mseAttachment = null
      this.casingCollarAttachment = null
      this.totalHcAttachment = null
      this.gammaAttachment = null
      this.useMse = false
      this.useCasingCollar = false
      this.useTotalHc = false
      this.useGamma = false
    },

    /** 取最新的一份：同一井可能多次上传（旧版本 / 修正版），只认最新 */
    pickLatest(list, type) {
      const rows = (list || []).filter(
        a => String(a.attachmentType || '').toUpperCase() === type
      )
      if (!rows.length) return null
      return rows.slice().sort((a, b) => {
        const ta = new Date(a.uploadTime || 0).getTime() || 0
        const tb = new Date(b.uploadTime || 0).getTime() || 0
        if (tb !== ta) return tb - ta
        return String(b.attachmentId || '').localeCompare(String(a.attachmentId || ''))
      })[0]
    },

    /**
     * 从单井工作台（COMM_WB_ATTACHMENT）检索本井材料并自动回填。
     * attachmentType 与工作台模块卡片完全一致：
     * MSE / CASING_COLLAR / TOTAL_HC / GAMMA。
     * @param {Boolean} manual 用户点「重新检索」时，给出明确提示（首次静默）
     */
    async loadAttachmentsFromWorkbench(manual) {
      const wellId = this.wbWellId || this.selectedWellId
      if (!wellId) {
        if (manual) this.$message.warning('请先选择井号')
        return
      }
      // 用户已手动取消勾选的项，重新检索后保持取消
      const keep = {
        mse: this.useMse,
        collar: this.useCasingCollar,
        hc: this.useTotalHc,
        gamma: this.useGamma
      }
      this.attLoading = true
      try {
        const res = await getAttachments(wellId)
        const list = (res && res.data) || []
        this.attCount = list.length
        this.mseAttachment = this.pickLatest(list, 'MSE')
        this.casingCollarAttachment = this.pickLatest(list, 'CASING_COLLAR')
        this.totalHcAttachment = this.pickLatest(list, 'TOTAL_HC')
        this.gammaAttachment = this.pickLatest(list, 'GAMMA')
        // 首次检索：有则默认勾选；重新检索：保持用户原有勾选
        this.useMse = this.mseAttachment ? (manual ? keep.mse || !this.attScanned : true) : false
        this.useCasingCollar = this.casingCollarAttachment ? (manual ? keep.collar || !this.attScanned : true) : false
        this.useTotalHc = this.totalHcAttachment ? (manual ? keep.hc || !this.attScanned : true) : false
        this.useGamma = this.gammaAttachment ? (manual ? keep.gamma || !this.attScanned : true) : false
        this.attScanned = true
        if (manual) {
          const got = this.curveItems.filter(i => i.attachment).length
          this.$message.success(got ? `已带入 ${got} 项曲线材料` : '本井暂无曲线材料，请先在单井工作台上传')
        }
      } catch (e) {
        this.attScanned = true
        if (manual) this.$message.error('检索工作台材料失败：' + (e.message || '未知错误'))
      } finally {
        this.attLoading = false
      }
    },

    /** 附件悬浮提示：文件名 + 上传时间 */
    attTip(att) {
      if (!att) return ''
      return `${att.fileName || ''}${att.uploadTime ? ' · ' + att.uploadTime : ''}`
    },

    /** 从文档中心查本井的压裂地质设计（取当前版本最新一条） */
    async loadDesignDoc(wellId) {
      this.designDoc = null
      try {
        // wbWellId 才是文档中心里文档的归属键（工作台井号），wellId 是井库 ID
        const res = await listWellDocs(wellId, { docType: 'GEOLOGICAL_DESIGN' })
        const list = (res && res.data) || []
        // 优先当前版本，其次按上传时间倒序取最新
        const found = list.filter(d => d.docType === 'GEOLOGICAL_DESIGN' && d.fileId)
          .sort((a, b) => {
            const ca = a.currentFlag === 1 || a.isCurrent === 1 || a.current === true
            const cb = b.currentFlag === 1 || b.isCurrent === 1 || b.current === true
            if (ca !== cb) return cb ? 1 : -1
            return (new Date(b.uploadTime || 0).getTime() || 0) - (new Date(a.uploadTime || 0).getTime() || 0)
          })[0] || null
        this.designDoc = found
        this.useDesignDoc = !!(found || this.designDocFile)
      } catch (e) {
        // 文档中心不可达时静默降级，由 designDocHint 提示改用本地文件
        this.designDoc = null
        this.useDesignDoc = !!this.designDocFile
      }
    },

    /** 本地选择设计文档 */
    onDesignDocPicked(file) {
      const raw = file && file.raw
      if (!raw) return
      const lower = (raw.name || '').toLowerCase()
      const ok = ['.doc', '.docx', '.xls', '.xlsx'].some(ext => lower.endsWith(ext))
      if (!ok) {
        this.$message.warning('设计文档仅支持 doc / docx / xls / xlsx')
        return
      }
      this.designDocFile = raw
      this.useDesignDoc = true
    },

    /** 取设计文档 File（本地优先，其次文档中心下载） */
    async fetchDesignDocFile() {
      if (this.designDocFile) return this.designDocFile
      if (!this.designDoc || !this.designDoc.docId) return null
      try {
        const blob = await downloadWellDoc(this.designDoc.docId)
        if (!blob || !blob.size) return null
        return new File([blob], this.designDoc.fileName || 'design.docx', {
          type: this.designDoc.contentType || 'application/octet-stream'
        })
      } catch (e) {
        const msg = e && e.isServerMessage ? e.message : (e.message || '下载设计文档失败')
        this.$message.warning(msg)
        return null
      }
    },

    resetParams() {
      this.params = {
        avoidDistance: 2,
        mseThreshold: 10,
        maxShift: 5,
        perforationMethod: '全程固井'
      }
      this.useMse = !!this.mseAttachment
      this.useCasingCollar = !!this.casingCollarAttachment
      this.useTotalHc = !!this.totalHcAttachment
      this.useGamma = !!this.gammaAttachment
      this.useDesignDoc = !!this.designDocSource
      this.result = null
    },

    /**
     * 生成射孔方案（2 表 1 图）。
     *
     * @param {Object} opts
     * @param {Boolean} opts.auto 自动触发（进页面材料齐全时）。自动触发下：
     *   - 不弹「未选择设计文档」这类警告，避免刚进页面就一串黄条；
     *   - 失败时提示带「可点开始生成重试」引导；
     *   - 不清空 autoGenTried（失败不自动重试）。
     */
    async runGenerate(opts) {
      const isAuto = !!(opts && opts.auto)
      if (!this.selectedWellId) {
        this.$message.warning('请先选择井号')
        return
      }
      this.running = true
      // 重新生成 → 上一份草稿作废（它属于上一轮结果），不清会导致新结果被旧改动污染
      this.clearDrafts()
      this.result = null
      /*
       * 重新生成 → 上一版上传的图也作废。
       *
       * 图是「跟着某一版方案走的」，新算出来的段/簇已换，旧图内容对不上了；
       * 而且新结果还没入库，带着旧 docId 保存会把上一版的图挂到新版本上。
       * 用户要留图，重新上传一次即可。
       */
      this.clearCrushChartUpload()
      this.generatingText = '正在生成射孔方案…'

      const auxFiles = {}
      // 设计文档（源文档）：本地文件优先，其次文档中心下载
      if (this.useDesignDoc) {
        this.generatingText = '正在读取设计文档…'
        if (!this.designDocSource) {
          if (!isAuto) this.$message.warning('未选择设计文档，将使用模拟数据生成示例方案')
        } else {
          const doc = await this.fetchDesignDocFile()
          if (doc) {
            auxFiles.sourceDoc = doc
            console.log('[射孔] 设计文档已附加：', doc.name, doc.size, 'bytes')
          } else if (!isAuto) {
            this.$message.warning('设计文档读取失败，将使用模拟数据生成示例方案')
          }
        }
      } else {
        console.log('[射孔] 设计文档未勾选，使用模拟数据')
      }
      if (this.useMse && this.mseAttachment) {
        this.generatingText = '正在读取 MSE 曲线…'
        auxFiles.mseFile = await this.fetchFileFromAttachment(this.mseAttachment)
      }
      if (this.useCasingCollar && this.casingCollarAttachment) {
        this.generatingText = '正在读取套管接箍数据…'
        auxFiles.casingCollarFile = await this.fetchFileFromAttachment(this.casingCollarAttachment)
      }
      if (this.useTotalHc && this.totalHcAttachment) {
        this.generatingText = '正在读取全烃数据…'
        auxFiles.totalHydrocarbonFile = await this.fetchFileFromAttachment(this.totalHcAttachment)
      }
      if (this.useGamma && this.gammaAttachment) {
        this.generatingText = '正在读取伽马曲线…'
        auxFiles.gammaFile = await this.fetchFileFromAttachment(this.gammaAttachment)
      }
      // 剔除读取失败的槽位，避免把 null 传给后端
      Object.keys(auxFiles).forEach(k => { if (!auxFiles[k]) delete auxFiles[k] })
      this.generatingText = '正在生成射孔方案…'

      const params = {
        wellName: this.wellName,
        wbWellId: this.wbWellId,
        avoidDistance: this.params.avoidDistance,
        mseThreshold: this.params.mseThreshold,
        maxShift: this.params.maxShift,
        perforationMethod: this.params.perforationMethod
      }

      const onEvent = (event, data) => {
        if (event === 'section') {
          this.generatingText = data.desc || '正在处理…'
        }
      }

      try {
        const data = await generatePerforationStream(params, auxFiles, { onEvent })
        this.result = data || { segments: [] }
        // 新生成的结果尚未入库：清掉上一版的下载引用，避免「下载到旧版」
        this.savedInfo = ''
        this.savedTableId = ''
        this.savedWbWellId = ''
        this.$message.success(isAuto ? '已按材料自动生成射孔方案' : '射孔方案生成完成')
        // 生成完回到表 1（最常看）；图 1 在切到该标签页时由 onResultTabClick 按真实宽度渲染
        this.resultTab = 'segPlan'
        this.crushHover = null
      } catch (e) {
        const msg = e.message || '未知错误'
        this.$message.error(
          isAuto
            ? `自动生成失败：${msg}。可直接点「开始生成」重试`
            : '生成失败：' + msg
        )
        // 自动生成失败不自动重试：autoGenTried 已置 true，还留在本井就不再触发。
        // 但要把从后端 SSE 拿到的文字清掉，别让用户以为还在跑。
      } finally {
        this.running = false
        this.generatingText = '正在生成射孔方案…'
      }
    },

    async fetchFileFromAttachment(att) {
      if (!att || !att.filePath) {
        console.warn('[射孔] 附件缺少 filePath，跳过：', att && att.fileName)
        return null
      }
      try {
        const base = process.env.VUE_APP_BASE_API || '/api'
        const url = `${base}/v1/workbench/attachments/${att.attachmentId}/download`
        const res = await fetch(url)
        if (!res.ok) {
          this.$message.warning(`材料「${att.fileName || att.attachmentType}」读取失败（HTTP ${res.status}）`)
          return null
        }
        const blob = await res.blob()
        if (!blob || !blob.size) {
          this.$message.warning(`材料「${att.fileName || att.attachmentType}」内容为空`)
          return null
        }
        return new File([blob], att.fileName || 'file', { type: blob.type || 'application/octet-stream' })
      } catch (e) {
        console.warn('获取附件文件失败', e)
        this.$message.warning(`材料「${att.fileName || ''}」读取失败，已跳过`)
        return null
      }
    },

    rowClassName({ row }) {
      if (row.packerAdjusted) return 'pa-row--packer'
      if (row.mseAdjusted) return 'pa-row--mse'
      return 'pa-row--normal'
    },

    /**
     * 段号写法，严格跟随《压裂工程设计》模板：
     *   表 1「（2）分段射孔方案」    → 中文数字：第一段、第二段…
     *   表 2「（3）计算煤岩破碎指数」→ 阿拉伯数字：第1段、第2段…
     * 模板里这两张表本身写法就不一致（已逐格核对 docx），既然要求
     * 「标题和模板一致」，这里不做统一，按 style 分别输出。
     * 中文数字超过十往回落到阿拉伯数字，避免出现「第十二段」以外的奇怪组合。
     */
    stageText(no, style) {
      const n = Number(no)
      if (!isFinite(n) || n <= 0) return '-'
      if (style === 'arabic') return '第' + n + '段'
      const cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
      if (n <= 10) return '第' + cn[n] + '段'
      return '第' + n + '段'
    },

    /**
     * 结果区标签页切换。
     *
     * 多道图在 el-tab-pane 里默认是 v-show 隐藏的，隐藏状态下
     * canvas.parentElement.clientWidth 为 0，直接画出来会是一片空白；
     * 所以每次切到表 2 都重新量宽度并重绘。
     * 表格不需要特殊处理（el-table 自己会重算列宽）。
     */
    onResultTabClick(tab) {
      const name = (tab && tab.name) || this.resultTab
      // 图 1 独立成标签页后，隐藏时 canvas 父容器 clientWidth = 0，
      // 每次切回都要按当前容器宽度重绘，否则图会被压成 320px 最小值。
      if (name === 'crushChart') {
        /*
         * 当前显示的是用户上传的图 → canvas 根本没挂载（模板里走了 img 分支），
         * 此时 renderCrushChart() 会因为 $refs.crushChartCanvas 为 undefined 直接
         * return；补取曲线也是为了画 canvas，纯属白跑一趟接口。直接跳过。
         */
        if (this.showUploadedChart) return
        // 回填「已保存版本」时 result 里没有 curves（结构化表只存数值列），
        // 直接重绘会得到一张空图。这里先按需补取曲线，再渲染。
        if (this.curvesMissing) {
          this.ensureCurves().then(() => this.$nextTick(() => this.renderCrushChart()))
          return
        }
        this.$nextTick(() => this.renderCrushChart())
      } else {
        this.crushHover = null
      }
    },

    /**
     * 当前结果是否缺曲线数据。
     *
     * 只有「从库回填的已保存版本」会缺曲线：结构化表（COMM_WB_POR_ROW/IDX）
     * 按设计只存数值列。刚生成完的结果一定带 curves，不走补取。
     */
    curvesMissing() {
      if (!this.result) return false
      const c = this.result.curves
      if (!c) return true
      const keys = ['mseCurve', 'pressureMseCurve', 'stressCurve', 'ropCurve',
        'wobCurve', 'rpmCurve', 'inclinationCurve']
      return !keys.some(k => Array.isArray(c[k]) && c[k].length)
    },

    /**
     * 补取曲线：解析工作台附件里的 MSE/全烃/伽马等文件，结果挂到 result.curves。
     *
     * 幂等保护用 curvesFetching，避免用户来回快速切 tab 时并发打多次。
     */
    async ensureCurves() {
      if (this.curvesFetching) return
      const wellId = this.wbWellId || this.selectedWellId
      if (!wellId) return
      this.curvesFetching = true
      this.generatingText = '正在解析曲线数据…'
      try {
        const res = await fetchPerforationCurves(wellId)
        const payload = (res && res.data) || res || {}
        const curves = payload.curves || {}
        // 补取结果必须挂回当前 result，否则 crushChartTracks 仍读到空对象
        if (this.result) {
          this.$set(this.result, 'curves', curves)
        }
        const pts = Object.keys(curves).reduce(
          (n, k) => n + (Array.isArray(curves[k]) ? curves[k].length : 0), 0)
        if (!pts) {
          const w = (payload.warnings || [])[0]
          this.$message.warning(w || '工作台附件里没有可用的曲线数据，图上无法绘制曲线')
        }
      } catch (e) {
        this.$message.warning('曲线数据解析失败：' + ((e && e.message) || '网络错误'))
      } finally {
        this.curvesFetching = false
        this.generatingText = ''
      }
    },

    // ================= 煤岩破碎指数多道图 =================

    /** 渲染多道图：量宽 → 建 canvas → 绘制 */
    renderCrushChart() {
      this.$nextTick(() => {
        const canvas = this.$refs.crushChartCanvas
        if (!canvas || !this.crushChartTracks.length) return
        const box = canvas.parentElement
        // 每次重绘按 DPR 放大，避免高分屏线条发虚
        const dpr = window.devicePixelRatio || 1
        const cssW = Math.max(320, (box && box.clientWidth) || 640)
        const tracks = this.crushChartTracks
        /*
         * 道高按道数分档，而不是写死 72。
         *
         * 历史：原来 6 道锁 72px（共 432+46=478px），目的是让「图 1 + 表 2 标题」
         * 挤在一屏内。但需求扩到 8 道后，8×72=576px 每一道只剩 72px，
         * pressure_mse / MSE 这类波动大的曲线会糊成一片高密度锯齿，读不出来。
         *
         * 现行档位（保证单道不低于 78px 的可读下限，同时 8 道总高可控）：
         *   ≤6 道 → 88px（道少可以画舒展些）
         *   7~8 道 → 92px
         *   ≥9 道 → 80px（道多时收一点，避免图过高要滚动很久）
         */
        const n = tracks.length
        const TRACK_H = n <= 6 ? 88 : (n <= 8 ? 92 : 80)
        const cssH = tracks.length * TRACK_H + 46

        canvas.style.width = cssW + 'px'
        canvas.style.height = cssH + 'px'
        canvas.width = Math.round(cssW * dpr)
        canvas.height = Math.round(cssH * dpr)

        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        this._drawCrushChart(ctx, cssW, cssH, tracks, TRACK_H)
      })
    },

    /**
     * 绘制多道图（对齐「图片1」测井多道图风格）。
     *
     * 视觉规则：
     * - 底色 #f8f9fb，道与道之间浅灰分隔；
     * - 横向浅网格（4 等分）+ 每道左侧 4 档量程刻度；
     * - 道名竖排在左侧留白区，字体 10px 浅灰；
     * - 曲线细线 1.2px，单色；破碎指数用按簇色带 + 中点连线；
     * - 参考线青色实线横向拉满（MSE 阈值）；
     * - 只在最底部画一条深度轴，刻度朝下，无外框。
     */
    _drawCrushChart(ctx, W, H, tracks, TRACK_H) {
      // 布局：横轴 = 深度（与参考图一致，多道纵向堆叠、共用一条深度横轴）
      // 左侧预留两列：0~40 道名列（横排），40~PAD.left 量程刻度列
      const PAD = { left: 104, right: 16, top: 12, bottom: 34 }
      const plotW = W - PAD.left - PAD.right
      const { mdMin, mdMax } = this.crushChartRange
      const mdRange = mdMax - mdMin || 1

      // 深度 → X（各道共用，保证同深度在每道横向对齐）
      const toX = md => PAD.left + ((md - mdMin) / mdRange) * plotW

      // 底色
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#f8f9fb'
      ctx.fillRect(0, 0, W, H)

      // 纵向竖网格（深度刻度对齐），贯穿全部道
      const totalH = tracks.length * TRACK_H
      const vTicks = 6
      for (let i = 0; i <= vTicks; i++) {
        const x = PAD.left + (plotW * i) / vTicks
        ctx.strokeStyle = i === 0 || i === vTicks ? '#e0e3e8' : '#eef0f3'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, PAD.top)
        ctx.lineTo(x, PAD.top + totalH)
        ctx.stroke()
      }

      // 逐道绘制
      tracks.forEach((tr, ti) => {
        const yTop = PAD.top + ti * TRACK_H
        const yBottom = yTop + TRACK_H

        // 道分隔线
        ctx.strokeStyle = '#e0e3e8'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PAD.left, yBottom)
        ctx.lineTo(PAD.left + plotW, yBottom)
        ctx.stroke()

        // 量程
        const [vMin, vMax] = this._crushDomain(tr)
        const vRange = vMax - vMin || 1
        // 值 → Y（每道独立量程，Y 从道底到道顶）
        const toY = v => yBottom - ((v - vMin) / vRange) * TRACK_H

        // 横向浅网格 + 左侧量程刻度（4 等分）
        for (let k = 0; k <= 4; k++) {
          const y = yTop + (TRACK_H * k) / 4
          ctx.strokeStyle = k === 0 || k === 4 ? '#e0e3e8' : '#eef0f3'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(PAD.left, y)
          ctx.lineTo(PAD.left + plotW, y)
          ctx.stroke()

          const v = vMax - (vRange * k) / 4
          ctx.fillStyle = '#9aa0a6'
          ctx.font = '9px sans-serif'
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillText(this._fmtAxis(v), PAD.left - 5, y)
        }

        // 道名（左侧第一列，横排；满量程居中对齐到道中）
        ctx.save()
        ctx.fillStyle = '#6b7480'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        // 有单位或恒值提示时道名上移，给下方两行小字留位
        ctx.fillText(tr.label, 6, yTop + TRACK_H / 2 - (tr.unit || tr.flat ? 5 : 0))
        if (tr.unit) {
          ctx.fillStyle = '#b0b6bd'
          ctx.font = '8px sans-serif'
          ctx.fillText(tr.unit, 6, yTop + TRACK_H / 2 + 7)
        }
        if (tr.flat) {
          // 恒值道必须在道头点明，否则用户会以为「是不是没数据 / 曲线画错了」
          ctx.fillStyle = '#c07a1a'
          ctx.font = '8px sans-serif'
          ctx.fillText('恒值 ' + this._fmtAxis(tr.flatValue), 6, yTop + TRACK_H / 2 + (tr.unit ? 16 : 7))
        }
        ctx.restore()

        // 道内裁剪（曲线不越道）
        ctx.save()
        ctx.beginPath()
        ctx.rect(PAD.left, yTop, plotW, TRACK_H)
        ctx.clip()

        // ---- 参考线（阈值，青色横线，对齐参考图观感）----
        if (tr.refLine && isFinite(tr.refLine.value)) {
          const y = toY(tr.refLine.value)
          if (y >= yTop && y <= yBottom) {
            ctx.strokeStyle = '#31c9c0'
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(PAD.left, y)
            ctx.lineTo(PAD.left + plotW, y)
            ctx.stroke()
            ctx.fillStyle = '#12a89f'
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'bottom'
            ctx.fillText(tr.refLine.label, PAD.left + 4, y - 2)
          }
        }

        // ---- 按道类型绘制 ----
        if (tr.kind === 'marks') {
          // 射孔簇位：簇顶→簇底画实心条，条高固定在道高 55%，居中显示
          const barH = TRACK_H * 0.55
          const barY = yTop + (TRACK_H - barH) / 2
          tr.points.forEach(p => {
            const x1 = toX(p.md)
            const x2 = toX(p.bottom != null ? p.bottom : p.md)
            const xLeft = Math.min(x1, x2)
            const wBar = Math.max(2, Math.abs(x2 - x1))
            // 调整过的簇用橙色，其余蓝色
            ctx.fillStyle = p.adjusted ? 'rgba(230,140,40,0.85)' : 'rgba(24,144,255,0.85)'
            ctx.fillRect(xLeft, barY, wBar, barH)
          })
        } else if (tr.kind === 'cluster') {
          // 破碎指数：簇段画淡色带（贯穿道高）+ 中点折线 + 数据点
          tr.points.forEach(p => {
            const x1 = toX(Math.min(p.md, p.bottom))
            const x2 = toX(Math.max(p.md, p.bottom))
            ctx.fillStyle = p.adjusted ? 'rgba(230,140,40,0.20)' : 'rgba(214,69,65,0.14)'
            ctx.fillRect(x1, yTop, Math.max(1.5, x2 - x1), TRACK_H)
          })
          // 中点折线（按深度顺序）
          ctx.beginPath()
          ctx.strokeStyle = tr.color
          ctx.lineWidth = 1.3
          ctx.lineJoin = 'round'
          tr.points.forEach((p, i) => {
            const x = toX(p.md)
            const y = toY(p.value)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.stroke()
          // 数据点
          tr.points.forEach(p => {
            const x = toX(p.md)
            const y = toY(p.value)
            ctx.fillStyle = tr.color
            ctx.beginPath()
            ctx.arc(x, y, 2.2, 0, Math.PI * 2)
            ctx.fill()
          })
        } else if (tr.kind === 'bar') {
          // 汇总道：每个射孔段一根柱，柱高 = 该段破碎指数均值，柱宽 = 段深区间。
          // 横向是深度，所以柱子「宽」随段长变化，柱从道底起画到 toY(value)。
          tr.points.forEach(p => {
            const a = Math.min(p.md, p.bottom != null ? p.bottom : p.md)
            const b = Math.max(p.md, p.bottom != null ? p.bottom : p.md)
            const x1 = toX(a)
            const x2 = toX(b)
            const xLeft = Math.min(x1, x2)
            const wBar = Math.max(2, Math.abs(x2 - x1))
            const yTopVal = toY(p.value)
            const hBar = yBottom - yTopVal
            ctx.fillStyle = 'rgba(214,69,65,0.78)'
            ctx.fillRect(xLeft + 0.5, yTopVal, Math.max(1, wBar - 1), hBar)
            // 柱顶描边，视觉上更利落
            ctx.strokeStyle = 'rgba(180,40,36,0.9)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(xLeft + 0.5, yTopVal)
            ctx.lineTo(xLeft + 0.5 + Math.max(1, wBar - 1), yTopVal)
            ctx.stroke()
          })
        } else {
          // 连续曲线：细线 1.2px。恒值道（钻压恒 40 / 转速恒 30 等）额外标注，
          // 否则用户会把水平线误读成「曲线断了 / 没数据」。
          ctx.beginPath()
          ctx.strokeStyle = tr.color
          ctx.lineWidth = 1.2
          ctx.lineJoin = 'round'
          let started = false
          tr.points.forEach(p => {
            const x = toX(p.md)
            const y = toY(p.value)
            if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
          })
          ctx.stroke()
          if (tr.flat) {
            ctx.fillStyle = 'rgba(192,122,26,0.85)'
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'right'
            ctx.textBaseline = 'bottom'
            ctx.fillText('恒值 ' + this._fmtAxis(tr.flatValue), PAD.left + plotW - 3, toY(tr.flatValue) - 2)
          }
          /*
           * 无数据区提示。
           *
           * 射孔段范围取自簇顶/簇底（本井 1615~2783），而曲线文件往往只覆盖
           * 其中一段（本井 1877~2870）。不画提示的话，左侧那段空白会被当成
           * 「图没画出来 / 页面坏了」。这里按首尾采样点算出缺口，铺一层浅灰
           * 斜纹并把「无曲线数据」写上去，一眼就知道是源文件没覆盖到。
           */
          const firstMd = tr.points[0] ? tr.points[0].md : null
          const lastMd = tr.points[tr.points.length - 1] ? tr.points[tr.points.length - 1].md : null
          if (firstMd != null && lastMd != null) {
            const gaps = []
            if (firstMd > mdMin + 1) gaps.push([mdMin, firstMd])
            if (lastMd < mdMax - 1) gaps.push([lastMd, mdMax])
            gaps.forEach(g => {
              const gx1 = toX(g[0])
              const gx2 = toX(g[1])
              const gw = gx2 - gx1
              if (gw < 6) return
              ctx.fillStyle = 'rgba(140,148,158,0.10)'
              ctx.fillRect(gx1, yTop, gw, TRACK_H)
              // 边界虚线
              ctx.save()
              ctx.setLineDash([3, 3])
              ctx.strokeStyle = 'rgba(140,148,158,0.5)'
              ctx.lineWidth = 1
              ;[gx1, gx2].forEach(x => {
                ctx.beginPath()
                ctx.moveTo(x, yTop)
                ctx.lineTo(x, yBottom)
                ctx.stroke()
              })
              ctx.restore()
              // 文案（只在该道第一次遇到缺口、且宽度够写时才写，避免糊成一团）
              if (gw > 46) {
                ctx.fillStyle = 'rgba(120,128,138,0.85)'
                ctx.font = '9px sans-serif'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('无曲线数据', gx1 + gw / 2, yTop + TRACK_H / 2)
              }
            })
          }
        }

        ctx.restore()
      })

      // 底部深度轴
      const axisY = PAD.top + totalH
      ctx.strokeStyle = '#d5d8dd'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD.left, axisY)
      ctx.lineTo(PAD.left + plotW, axisY)
      ctx.stroke()

      for (let i = 0; i <= vTicks; i++) {
        const md = mdMin + (mdRange * i) / vTicks
        const x = PAD.left + (plotW * i) / vTicks
        ctx.strokeStyle = '#d5d8dd'
        ctx.beginPath()
        ctx.moveTo(x, axisY)
        ctx.lineTo(x, axisY + 4)
        ctx.stroke()
        ctx.fillStyle = '#9aa0a6'
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(this._fmtAxis(md), x, axisY + 7)
      }
      ctx.fillStyle = '#8a9099'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText('深度 (m)', PAD.left + plotW, axisY + 19)

      // 供 hover 反查用
      this._crushGeom = { PAD, plotW, TRACK_H, trackCount: tracks.length, mdMin, mdRange }
    },

    /**
     * 单道量程：优先用 tr.domain，否则按数据自适应（上下留 8% 余量）。
     *
     * ⚠️ 只允许一个定义：此前误留了两份同名方法，后一份静默覆盖前一份，
     *    改逻辑时很容易只改了「看不见的那份」。合并时别重新引入。
     */
    _crushDomain(tr) {
      if (Array.isArray(tr.domain)) return tr.domain
      const vals = tr.points.map(p => p.value).filter(isFinite)
      if (!vals.length) return [0, 1]
      let lo = Math.min.apply(null, vals)
      let hi = Math.max.apply(null, vals)
      if (hi - lo < 1e-6) { hi = lo + 1 }
      /*
       * 柱状道（汇总）量程必须从 0 起。
       * 柱高 = 段内破碎指数均值（本井 3.45~7.04），若沿用「lo-pad ~ hi+pad」
       * 自适应，柱底会被裁到 3.45 而不是 0 —— 画出来是一排悬空小方块，
       * 段间差异被放大失真，与人眼对柱状图的预期（长度∝数值）冲突。
       * 顶部留 15% 余量给柱顶标注。
       */
      if (tr.kind === 'bar') {
        return [0, hi <= 0 ? 1 : hi * 1.15]
      }
      const pad = (hi - lo) * 0.08
      return [lo - pad, hi + pad]
    },

    /** 量程刻度文字：大数省小数位，小数保留 1~2 位 */
    _fmtAxis(v) {
      const a = Math.abs(v)
      if (a >= 1000) return Math.round(v).toString()
      if (a >= 100) return v.toFixed(0)
      if (a >= 10) return v.toFixed(1)
      return v.toFixed(2)
    },

    /** 鼠标移动：按深度反查各道数值，显示浮层 */
    onCrushChartHover(e) {
      const g = this._crushGeom
      const canvas = this.$refs.crushChartCanvas
      if (!g || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      if (mx < g.PAD.left || mx > g.PAD.left + g.plotW ||
          my < g.PAD.top || my > g.PAD.top + g.trackCount * g.TRACK_H) {
        this.crushHover = null
        return
      }
      // 横轴是深度 → 用鼠标 X 反查深度（不是 Y）
      const md = g.mdMin + ((mx - g.PAD.left) / g.plotW) * g.mdRange
      const items = []
      this.crushChartTracks.forEach(tr => {
        if (!tr.points.length) return
        // 找深度上最近的采样点（区间类道按包含判断，更符合语义）
        let best = null
        if (tr.kind === 'marks' || tr.kind === 'cluster' || tr.kind === 'bar') {
          // 簇位 / 破碎指数 / 汇总柱都是区间型数据（md~bottom）
          const rel = tr.points.filter(p => {
            const a = Math.min(p.md, p.bottom != null ? p.bottom : p.md)
            const b = Math.max(p.md, p.bottom != null ? p.bottom : p.md)
            return md >= a - 1e-6 && md <= b + 1e-6
          })
          best = rel.length ? rel[0] : null
          if (!best) {
            let bestD = Infinity
            tr.points.forEach(p => {
              const d = Math.abs(p.md - md)
              if (d < bestD) { bestD = d; best = p }
            })
          }
        } else {
          let bestD = Infinity
          tr.points.forEach(p => {
            const d = Math.abs(p.md - md)
            if (d < bestD) { bestD = d; best = p }
          })
        }
        if (!best) return
        const unit = tr.unit ? ' ' + tr.unit : ''
        let text
        if (tr.kind === 'marks') {
          text = `${this._fmtAxis(best.md)} ~ ${this._fmtAxis(best.bottom)} m`
        } else if (tr.kind === 'bar') {
          // 汇总柱：段号 + 均值 + 深度区间 + 簇数
          const segName = best.label ? best.label + ' ' : ''
          const cnt = best.count != null ? `，${best.count} 簇` : ''
          text = `${segName}${this._fmtAxis(best.value)}（${this._fmtAxis(best.md)}~${this._fmtAxis(best.bottom)}m${cnt}）`
        } else if (tr.flat) {
          // 恒值道：明确写「恒值」，不显示最近点数值，避免误读
          text = `恒值 ${this._fmtAxis(best.value)}${unit}`
        } else {
          text = `${best.value.toFixed(2)}${unit}`
        }
        items.push({ label: tr.label, color: tr.color, text })
      })
      this.crushHover = {
        x: Math.min(mx + 14, rect.width - 180),
        y: Math.max(0, my + 12),
        md,
        items
      }
    },

    onCrushChartLeave() {
      this.crushHover = null
    },

    /**
     * 单元格编辑入口（两张表共用）。
     *
     * 只在用户真正动手改时才创建草稿 —— 没改过就一直用基准数据，
     * 这样「生成 / 回填 / 换井」都不需要额外同步草稿。
     *
     * @param {'seg'|'crush'} which 哪张表
     * @param {Number} idx 行下标
     * @param {String} field 字段名
     * @param {*} val 新值
     */
    onCellEdit(which, idx, field, val) {
      const isSeg = which === 'seg'
      const base = isSeg ? this.segPlanBase : this.crushIdxBase
      if (!base || !base[idx]) return

      // 首次编辑：把基准深拷贝一份做草稿。
      // 必须深拷贝：直接改基准对象会污染 result，重新生成前永远带着脏值。
      if (!isSeg && !(this.crushDraft && this.crushDraft.length)) {
        this.crushDraft = base.map(r => Object.assign({}, r))
      }
      if (isSeg && !(this.segDraft && this.segDraft.length)) {
        this.segDraft = base.map(r => Object.assign({}, r))
      }
      const draft = isSeg ? this.segDraft : this.crushDraft
      const row = draft[idx]
      if (!row) return

      // 数值列存 Number，空串/非法值存 null（后端 DTO 是 Double，
      // 传 '' 会反序列化失败；null 表示「该格留空」）
      const numFields = [
        'topMD', 'bottomMD', 'tvd', 'thickness', 'clusterSpacing', 'stageSpacing',
        'packerPosition', 'casingCollar', 'clusterNo',
        'crushIndex', 'mseValue', 'holeDensity'
      ]
      if (numFields.indexOf(field) >= 0) {
        const s = String(val == null ? '' : val).trim()
        row[field] = s === '' ? null : (isFinite(Number(s)) ? Number(s) : null)
      } else {
        row[field] = val
      }

      /*
       * 表 1（seg）的簇级联动：改顶深 / 厚度 → 重算底深。
       *
       * 口径（2026-11-15 二次修订）：
       *   厚度是<b>簇级</b>的：单簇段 2m、多簇段每簇 1m；
       *   底深 = 顶深 + 厚度（数值越大越深，是加不是减）。
       *
       * 联动规则（保持用户改哪列、哪列是「因」）：
       *   改顶深 → 底深 = 新顶深 + 当前厚度
       *   改厚度 → 底深 = 当前顶深 + 新厚度
       *   改底深 → 只反推厚度，不再让整段联动（厚度本就是簇级独立量）
       *
       * ⚠️ 此前这里做的是「整段重算跨度 max底−min顶 并铺给全段各簇」，
       *   那是段级跨度口径的产物；口径回到簇级后必须去掉，
       *   否则用户改第 1 簇顶深，同段第 2 簇的厚度也会被改成跨度值。
       */
      if (isSeg && (field === 'topMD' || field === 'bottomMD' || field === 'thickness')) {
        const t = Number(row.topMD)
        const th = Number(row.thickness)
        const b = Number(row.bottomMD)
        if (field === 'bottomMD') {
          // 改底深 → 厚度跟随（底深−顶深），顶深不动
          if (isFinite(t) && isFinite(b) && b >= t) {
            row.thickness = Math.round((b - t) * 100) / 100
          }
        } else if (isFinite(t) && isFinite(th) && th > 0) {
          // 改顶深或厚度 → 底深跟随（顶深 + 厚度）
          row.bottomMD = Math.round((t + th) * 100) / 100
        }
      }
    },

    /** 丢弃草稿，回到基准数据（生成 / 回填 / 换井时调用） */
    clearDrafts() {
      this.segDraft = null
      this.crushDraft = null
    },

    /** 把草稿并入 result，保证后续「复制数据」「图表」等读到的也是改后的值 */
    /**
     * 把草稿并回 result，供「保存成功后继续用基准渲染」。
     *
     * ⚠️ 这里不能简单 `result.segPlan = segDraft`。
     * 表 1 的渲染基准 segPlanBase 是「crushIdx 出行集 + segPlan 按 stageNo 回填段级属性」，
     * 也就是说表 1 每一行的簇级列（分簇 / 顶深 / 底深 / 厚度 / 封隔器 / 方向 / 方式）
     * 实际取自 result.crushIdx，而不是 result.segPlan。
     * 只写 result.segPlan 的话，用户改的簇级值会被 result.crushIdx 的旧值盖回去，
     * 表现就是「保存成功后单元格数值回弹」。
     *
     * 所以按字段归属拆两路写：
     *   - 簇级字段 → 写进 result.crushIdx 对应行（同 stageNo + clusterNo）
     *   - 段级字段 → 写进 result.segPlan 对应段（同 stageNo，该段每行都同步）
     */
    commitDraftsIntoResult() {
      if (!this.result) return
        // 注意 packerPosition：它是簇级列（表 1「封隔器位置」），但它同时也是
        // 泵注程序取桥塞深度的唯一来源，所以要跟着段级字段一起写到 segPlan 上。
        // clusterSpacing 已改为逐行口径，见下方注释，不在此列。
        const SEG_FIELDS = ['stageSpacing', 'casingCollar', 'packerPosition',
          'perforationDirection', 'perforationType']

      if (this.segDraft && this.segDraft.length) {
        /*
         * 1) 段级字段 → result.segPlan（按 stageNo 聚合，同段只留一条最新值）
         *
         * ⚠️ clusterSpacing 不在段级列表里 —— 它 2026-11-15 二次修订后变成
         *   <b>逐行</b>口径（第一段第1簇「/」，之后每行 |上一段顶−本段底|），
         *   同一段内各簇可能不同值，合并成段级单值会丢掉「第一段第1簇是 /」这条。
         *   它跟着簇级字段走（写 result.crushIdx），由表 1 逐行渲染。
         */
        const segByStage = {}
        this.segDraft.forEach(r => {
          if (!r || r.stageNo == null) return
          const cur = segByStage[r.stageNo] || {}
          // 首行出现的值优先（与 segPlanBase 的 byStage 取首行口径一致，避免漂移）
          SEG_FIELDS.forEach(f => {
            if (cur[f] === undefined && r[f] !== undefined && r[f] !== null && r[f] !== '') {
              cur[f] = r[f]
            }
          })
          segByStage[r.stageNo] = cur
        })
        const baseSegs = Array.isArray(this.result.segPlan) ? this.result.segPlan : []
        const seen = {}
        const nextSegPlan = baseSegs.map(s => {
          seen[s.stageNo] = true
          return Object.assign({}, s, segByStage[s.stageNo] || {})
        })
        // 草稿里出现了 result.segPlan 没有的段（理论上不会）→ 补进去，避免丢段
        Object.keys(segByStage).forEach(k => {
          if (!seen[k]) nextSegPlan.push(Object.assign({ stageNo: Number(k) }, segByStage[k]))
        })
        this.result.segPlan = nextSegPlan

        /*
         * 2) 簇级字段 → result.crushIdx
         *
         * ⚠️ 必须按「数组下标」对齐，不能用 stageNo+clusterNo 做业务键：
         *   segPlanBase 就是 crushIdx.map(...) 出来的，表 1 的第 i 行永远对应
         *   crushIdx 的第 i 行。用户一旦改了「分簇」这一格（clusterNo 本身可编辑），
         *   业务键就变了 —— 用键匹配会当场找不到原行，改动被丢弃，
         *   表现就是「保存后单元格回弹成旧值」。
         *   下标对齐则不受任何字段编辑影响。
         */
        if (Array.isArray(this.result.crushIdx) && this.result.crushIdx.length) {
          /*
           * ⚠️ thickness 与 clusterSpacing 都必须走<b>簇级</b>（写 result.crushIdx）：
           *   - thickness：表 1 与表 2 这一列同源同义 = 簇级底深−顶深（1 或 2）。
           *     早前一度改成段级跨度时把它摘出去过，口径回退后必须放回来，
           *     否则用户在表 1 改的厚度不会传给表 2 / 落库的 THICKNESS。
           *   - clusterSpacing：2026-11-15 第三次修订后是逐簇口径
           *     （第一段第 1 簇「/」，之后每簇 = |上一簇顶深 − 本簇底深|），
           *     同段各簇值不同，只能走簇级。
           *     落库到 COMM_WB_POR_ROW.CLUSTER_SPACING_M（簇级专用列），
           *     不能塞进段级 CLUSTER_SPACING —— 那一段只有一个值。
           */
          const CLUSTER_FIELDS = ['clusterNo', 'topMD', 'bottomMD', 'thickness', 'clusterSpacing',
            'tvd', 'packerPosition', 'casingCollar']
          const nextCrush = this.result.crushIdx.slice()
          this.segDraft.forEach((d, i) => {
            const c = nextCrush[i]
            if (!c || !d) return
            // 只在下标确实对应同一段时才合并，防止草稿被增删行后错位
            if (d.stageNo != null && c.stageNo != null && d.stageNo !== c.stageNo) return
            const merged = Object.assign({}, c)
            CLUSTER_FIELDS.forEach(f => {
              if (d[f] !== undefined) merged[f] = d[f]
            })
            nextCrush[i] = merged
          })
          this.result.crushIdx = nextCrush
        }
      }
      if (this.crushDraft && this.crushDraft.length) this.result.crushIdx = this.crushDraft
    },

    /**
     * 把「一簇一行」的表 1 收敛成「一段一行」，用于落库 SEG_PLAN。
     *
     * 为什么落库要收敛：
     *   SEG_PLAN 这张表的语义是一段一行（段级属性），页面上「一簇一行」只是为了
     *   对齐《压裂工程设计》模板的排版。若按簇原样提交，一段会被存成 N 条重复记录，
     *   回读 / 报告取数 / 历史版本对比都要额外去重，容易埋坑。
     *
     * 汇总口径：
     *   - 起止深度 = 该段所有簇的 min(顶深) / max(底深)
     *   - 射孔长度 = max(底深) − min(顶深)，即本段射孔井段跨度
     *                （2026-11-15 业务口径；此前为「Σ 各簇厚度」）
     *   - 簇数     = 该段实际簇行数（用户可能增删簇）
     *   - 段级属性取该段第一条非空值，与 segPlanBase 的 byStage 取首行口径一致
     */
    collapseSegPlanByStage(rows) {
      if (!Array.isArray(rows) || !rows.length) return []
      const has = v => v !== null && v !== undefined && v !== ''
      const order = []
      const acc = {}
      rows.forEach(r => {
        if (!r || r.stageNo == null) return
        const k = r.stageNo
        if (!acc[k]) {
          acc[k] = {
            stageNo: k,
            topMD: r.topMD,
            bottomMD: r.bottomMD,
            thicknessSum: 0,
            clusters: 0,
            clusterSpacing: r.clusterSpacing,
            stageSpacing: r.stageSpacing,
            casingCollar: r.casingCollar,
            /*
             * 封隔器位置：表 1 是「一簇一行」，而封隔器是**段级**值
             * （2026-11-15 第三次修订起 = 本段最大顶深 + 20，同段各簇相同），
             * 所以取该段任意一簇的值收敛成段级即可。
             *
             * 第一段整段是 null（业务要求「第一段空着」），收敛后仍是 null，
             * 不会因为「空着没值」而误取到别的段。
             *
             * 泵注程序要按段拿「桥塞位置 = 封隔器位置」，段级不存这条链路就断了。
             */
            packerPosition: r.packerPosition,
            perforationDirection: r.perforationDirection,
            perforationType: r.perforationType,
            mseAdjusted: !!r.mseAdjusted,
            packerAdjusted: !!r.packerAdjusted,
            remark: r.remark
          }
          order.push(k)
        }
        const a = acc[k]
        a.clusters += 1
        const t = Number(r.topMD)
        const b = Number(r.bottomMD)
        if (isFinite(t) && (!has(a.topMD) || t < Number(a.topMD))) a.topMD = t
        if (isFinite(b) && (!has(a.bottomMD) || b > Number(a.bottomMD))) a.bottomMD = b
        const th = Number(r.thickness)
        if (isFinite(th)) a.thicknessSum += th
        // 段级属性：首条为空时用后续行的值补上（用户只改了某一簇的情况）
        ;['clusterSpacing', 'stageSpacing', 'casingCollar', 'packerPosition',
          'perforationDirection', 'perforationType', 'remark'].forEach(f => {
          if (!has(a[f]) && has(r[f])) a[f] = r[f]
        })
        if (r.mseAdjusted) a.mseAdjusted = true
        if (r.packerAdjusted) a.packerAdjusted = true
      })
      return order.map(k => {
        const a = acc[k]
        /*
         * 射孔长度（落库 PERF_LENGTH）= Σ 本段各簇厚度。
         *
         * 口径（2026-11-15 二次修订，业务最新原话）：
         *   「厚度：当前段如果只有1簇 底深等于2 如果是2簇 底深等于1」
         *   即单簇段 2m、两簇段 1+1=2m —— 纯射孔厚度，不含簇间空白。
         *
         * ⚠️ 中间曾一度改成「max底−min顶」的射孔井段跨度（段 1 会得 192m），
         *   业务随后明确那不是厚度、是两簇之间的距离，已回退。
         *
         * ⚠️ 必须与后端 buildSegments 的 perforationLength 同口径（那边也是 Σ厚度），
         *   否则「生成后入库 2、保存一次变 192」这类漂移会再现（11-14/11-15 已踩两次）。
         */
        const length = Math.round(a.thicknessSum * 100) / 100
        return {
          stageNo: a.stageNo,
          startDepth: has(a.topMD) ? a.topMD : null,
          endDepth: has(a.bottomMD) ? a.bottomMD : null,
          perforationLength: length || null,
          clusters: a.clusters,
          /*
           * 簇（段）间距 —— 落库 SEG_PLAN 只有一个字段，而页面是逐行口径。
           *
           * 逐行值由 segPlanBase 按 clusterNo 从 clusterSpacingList 取好，
           * 这里只是收敛成「一个段一个值」落库。取段首非空值：
           * 第一段第 1 簇本来就是「/」（null），会落到同段第 2 簇的公式值上，
           * 不会因为首行空着就把整段写成空。
           */
          clusterSpacing: has(a.clusterSpacing) ? a.clusterSpacing : null,
          stageSpacing: has(a.stageSpacing) ? a.stageSpacing : null,
          casingCollar: has(a.casingCollar) ? a.casingCollar : null,
          packerPosition: has(a.packerPosition) ? a.packerPosition : null,
          perforationDirection: has(a.perforationDirection) ? a.perforationDirection : null,
          perforationType: has(a.perforationType) ? a.perforationType : null,
          mseAdjusted: a.mseAdjusted,
          packerAdjusted: a.packerAdjusted,
          remark: a.remark || ''
        }
      })
    },

    /**
     * 保存两张表。
     *
     * 主存储是结构化表（COMM_WB_POR_TABLE / COMM_WB_POR_ROW），
     * 同井同表类型保存时后端自动 VERSION_NO + 1，历史版本保留可回溯。
     * xlsx/docx/csv 都在下载时按需从结构化数据渲染，不重复存储。
     *
     * 页面上改过的单元格都落在草稿里，这里把草稿并回 result 再提交，
     * 保证入库的是「用户眼前这份」。
     */
    async saveTables() {
      if (!this.segPlanRows.length && !this.crushIdxRows.length) {
        this.$message.warning('暂无数据可保存')
        return
      }
      if (!this.wbWellId) {
        this.$message.warning('未识别到工作台井号，无法保存（请从单井工作台进入本页）')
        return
      }

      this.saving = true
      try {
        /*
         * 提交前把表 1 按段收敛。
         *
         * 表 1 在页面上是「一簇一行」（对齐模板），但 SEG_PLAN 这张表的语义是「一段一行」：
         * 段级属性（间距 / 接箍 / 方向 / 方式）在一段的每个簇上是重复的。
         * 如果原样提交 400 簇行，落库就是 400 条 SEG_PLAN 明细，
         * 回读和报告取数时 byStage 要遍历 400 条重复数据，且历史版本对比会失真。
         *
         * 所以：按 stageNo 去重，每段保留第一条（与渲染/取数「取首行」口径一致），
         * 顺便把该段的簇数、起止深度、射孔长度从簇明细汇总成段级字段。
         */
        const segPayload = this.collapseSegPlanByStage(this.segPlanRows)
        const payload = {
          wbWellId: this.wbWellId,
          wellName: this.wellName,
          perforationMethod: this.params.perforationMethod,
          avoidDistance: this.params.avoidDistance,
          mseThreshold: this.params.mseThreshold,
          maxShift: this.params.maxShift,
          segPlan: segPayload,
          crushIdx: this.crushIdxRows,
          /*
           * 图 1（煤岩破碎指数图）若为用户上传，把文档引用一起提交。
           *
           * 未上传时传空串而不是 undefined：后端 blankToNull() 会落成 NULL，
           * 「不传」和「显式清空」在语义上应该区分 —— 用户点了「恢复自动图」
           * 之后保存，是要把库里的图清掉的，不能因为字段缺省就保留旧图。
           */
          crushChartDocId: (this.crushChartUpload && this.crushChartUpload.docId) || '',
          crushChartFileName: (this.crushChartUpload && this.crushChartUpload.fileName) || ''
        }
        const res = await savePerforationTables(payload)
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : [])
        // 版本号取第一条（两张表同一次保存，版本号一致）
        const ver = list.length && list[0].versionNo ? list[0].versionNo : ''
        this.savedTableId = list.length ? list[0].tableId : ''
        this.savedWbWellId = this.wbWellId
        this.savedInfo = ver ? `已保存 第 ${ver} 版` : '已保存'
        // 保存成功 → 草稿已入库，清掉让渲染回到基准，避免两份数据并存
        this.commitDraftsIntoResult()
        this.clearDrafts()
        this.$message.success(
          `保存成功${ver ? '（第 ' + ver + ' 版）' : ''}：分段射孔方案计算 ${this.segPlanRows.length} 段 / 煤岩破碎指数 ${this.crushIdxRows.length} 簇`
        )
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || '未知错误'))
      } finally {
        this.saving = false
      }
    },

    /**
     * 下载表格。
     *
     * 用浏览器原生下载（后端已设置 Content-Disposition 中文文件名），
     * 不走 axios，避免二进制被拦截器当 JSON 解析。
     *
     * 优先级：本次保存的表 → 本井当前版本 → 提示先保存。
     * 未保存时直接下 'latest' 会拿到上一版数据，容易造成「下的不是眼前这份」，
     * 所以这里显式拦一道。
     */
    downloadTable(format) {
      if (!this.segPlanRows.length && !this.crushIdxRows.length) {
        this.$message.warning('暂无数据可下载')
        return
      }
      const sameWell = this.savedWbWellId && this.savedWbWellId === this.wbWellId
      const useTableId = sameWell && this.savedTableId ? this.savedTableId : ''
      if (!useTableId) {
        this.$confirm(
          '当前结果尚未保存，下载会取该井已保存的最新一版。是否先保存当前结果？',
          '提示',
          { confirmButtonText: '先保存再下载', cancelButtonText: '直接下载旧版', type: 'warning' }
        ).then(async () => {
          await this.saveTables()
          if (this.savedTableId) this._doDownload(format, this.savedTableId)
        }).catch(() => {
          this._doDownload(format, 'latest')
        })
        return
      }
      this._doDownload(format, useTableId)
    },

    /**
     * 真正的下载动作。
     *
     * ⚠️ 为什么不用 `<a href download>` 直接指后端地址：
     *   浏览器对 <a download> 的失败响应是完全静默的 —— 后端返回 400/500 时
     *   页面既不报错也不跳转，用户只看到「正在下载…」然后就什么都没有。
     *   而射孔方案下载最常见的失败就是「该井还没保存过表」（后端返 400 + JSON 原因），
     *   这个提示必须让用户看见，否则他不知道要先点保存。
     *   所以改用 fetch → 判定 content-type：
     *     · JSON  → 说明后端失败，解析出 message 弹 error
     *     · 二进制 → 走 blob 触发浏览器下载
     */
    async _doDownload(format, tableId, scope) {
      const url = perforationTableDownloadUrl(format, {
        tableId,
        wbWellId: this.wbWellId,
        scope: scope || 'all'
      })
      const label = { xlsx: 'Excel', docx: 'Word', csv: 'CSV' }[format] || format
      const tableName = { segPlan: '分段射孔方案', crushIdx: '煤岩破碎指数' }[scope] || ''
      const fileLabel = `${tableName ? tableName + ' ' : ''}${label}`
      try {
        const res = await fetch(url)
        const ctype = (res.headers.get('content-type') || '').toLowerCase()
        if (!res.ok || ctype.indexOf('application/json') >= 0) {
          let msg = `下载 ${fileLabel} 失败（HTTP ${res.status}）`
          try {
            const j = await res.json()
            if (j && j.message) msg = j.message
          } catch (e) {
            // body 不是 JSON（比如网关兜底返回 HTML），保持默认文案
          }
          this.$message.error({ message: msg, duration: 6000 })
          return
        }
        // 从 Content-Disposition 取后端给的文件名，取不到就自己拼一个
        let filename = ''
        const cd = res.headers.get('content-disposition') || ''
        const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
        if (m && m[1]) {
          try {
            filename = decodeURIComponent(m[1])
          } catch (e) {
            filename = m[1]
          }
        }
        if (!filename) {
          filename = `${this.wellName || this.wbWellId}${tableName ? '-' + tableName : ''}.${format}`
        }
        const blob = await res.blob()
        const objUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objUrl
        a.download = filename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // 立即 revoke 会让某些浏览器来不及读 blob，延迟释放
        setTimeout(() => window.URL.revokeObjectURL(objUrl), 3000)
        this.$message.success(`已下载 ${fileLabel}：${filename}`)
      } catch (e) {
        this.$message.error(`下载 ${fileLabel} 失败：${(e && e.message) || '网络错误'}`)
      }
    },

    /**
     * 单张表导出 Excel。
     *
     * 与「下载 ▾ → Excel（两张表）」的区别：只导这一张表，xlsx 里只有一个 sheet，
     * 文件名也带表名，方便单独贴进设计文档。
     *
     * @param {String} scope 'segPlan' | 'crushIdx'
     */
    exportSingle(scope) {
      const rows = scope === 'segPlan' ? this.segPlanRows : this.crushIdxRows
      if (!rows || !rows.length) {
        this.$message.warning('暂无数据可导出')
        return
      }
      const sameWell = this.savedWbWellId && this.savedWbWellId === this.wbWellId
      const useTableId = sameWell && this.savedTableId ? this.savedTableId : ''
      if (!useTableId) {
        this.$confirm(
          '当前结果尚未保存，导出会取该井已保存的最新一版。是否先保存当前结果？',
          '提示',
          { confirmButtonText: '先保存再导出', cancelButtonText: '直接导出旧版', type: 'warning' }
        ).then(async () => {
          await this.saveTables()
          if (this.savedTableId) this._doDownload('xlsx', this.savedTableId, scope)
        }).catch(() => {
          this._doDownload('xlsx', 'latest', scope)
        })
        return
      }
      this._doDownload('xlsx', useTableId, scope)
    },

    /**
     * 把「图 1 煤岩破碎指数多道曲线」导出为 PNG 的公共实现。
     *
     * 为什么用 canvas.toBlob 而不是 toDataURL：
     *   toDataURL 返回 base64 字符串，一张 1114×782 的图 base64 后约 800KB~1.5MB，
     *   既占内存又要走一遍字符串编解码；toBlob 直接拿二进制，且是异步的，
     *   不会像同步的 toDataURL 那样阻塞主线程（图有 8 道、近万点，同步编码会卡一下）。
     *
     * ⚠️ 两个必须注意的点：
     *   1. canvas 尺寸已按 dpr 放大（见 renderCrushChart），toBlob 出来的就是
     *      高分辨率原图，不能再手动 scale，否则会重采样变糊。
     *   2. 必须先确认 canvas 已经画过内容。这里用 crushChartTracks.length 判断
     *      而不是 canvas.width，因为 canvas 可能刚挂载还没 renderCrushChart。
     *
     * @returns {Promise<Blob|null>} 失败返回 null（调用方决定提示文案）
     */
    _crushChartToBlob() {
      return new Promise(resolve => {
        if (!this.crushChartTracks.length) {
          resolve(null)
          return
        }
        const canvas = this.$refs.crushChartCanvas
        if (!canvas || !canvas.width || !canvas.height) {
          resolve(null)
          return
        }
        try {
          canvas.toBlob(blob => resolve(blob), 'image/png')
        } catch (e) {
          // 极少数环境（如 canvas 被污染）会抛 SecurityError，交由调用方提示
          resolve(null)
        }
      })
    },

    /** 图 1 的文件名：井号 + 图名 + 日期时间，便于在文档中心里区分版本 */
    _crushChartFileName() {
      const well = this.wellName || this.wbWellId || '未知井'
      const d = new Date()
      const p = n => String(n).padStart(2, '0')
      const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
        + `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
      return `${well}-煤岩破碎指数图-${ts}.png`
    },

    /**
     * 图 1：下载 PNG 到本地。
     *
     * 两种来源分别处理（2026-11-14 起图可上传）：
     *   · 显示上传图时 → 直接按 preview 接口把二进制拉回来存盘，
     *     文件名沿用用户上传时的原始名（就是他自己那张图，不该被改名成
     *     「井号-煤岩破碎指数图-时间戳.png」，否则他会以为系统重新生成了一张）；
     *   · 显示自动图时 → 沿用原来的 canvas.toBlob() 逻辑，零改动。
     */
    async exportCrushChartImage() {
      // ---- 分支 1：上传图 ----
      if (this.showUploadedChart) {
        this.chartSaving = true
        try {
          const url = this.crushChartUpload.url
          const resp = await fetch(url)
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          const blob = await resp.blob()
          const filename = this.crushChartUpload.fileName || this._crushChartFileName()
          const objUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = objUrl
          a.download = filename
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => window.URL.revokeObjectURL(objUrl), 3000)
          this.$message.success(`已下载图片：${filename}`)
        } catch (e) {
          // 预览接口拿不到（文档中心不可达且本地兜底文件被清理）时，
          // 退化成「新窗口打开」，用户仍能右键另存
          this.$message.warning('下载失败，已尝试在新窗口打开图片，可右键另存为')
          window.open(this.crushChartUpload.url, '_blank')
        } finally {
          this.chartSaving = false
        }
        return
      }

      // ---- 分支 2：自动图（原逻辑保持不变） ----
      if (!this.crushChartTracks.length) {
        this.$message.warning('暂无图表数据可导出')
        return
      }
      this.chartSaving = true
      try {
        const blob = await this._crushChartToBlob()
        if (!blob) {
          this.$message.error('图表尚未绘制完成，请稍后重试')
          return
        }
        const filename = this._crushChartFileName()
        const objUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objUrl
        a.download = filename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // 与 _doDownload 一致：延迟释放，避免浏览器还没读完就被回收
        setTimeout(() => window.URL.revokeObjectURL(objUrl), 3000)
        this.$message.success(`已下载图片：${filename}`)
      } catch (e) {
        this.$message.error(`下载图片失败：${(e && e.message) || '网络错误'}`)
      } finally {
        this.chartSaving = false
      }
    },

    /**
     * 图 1：保存到文档中心（归档到本井名下）。
     *
     * 走工作台通用的文档上传接口 POST /v1/workbench/well/{wbWellId}/doc/upload：
     *   - docType 用 GENERATED_REPORT（「系统生成文档」）—— 这张图是系统按本井
     *     数据算出来的产物，归到「其他资料」里会和用户自己传的原始材料混在一起；
     *   - 带上 wellName，文档中心按井归属，报告生成/知识库检索时能按井找到。
     *
     * 后端 upload 内部已经处理了「文档中心不可达 → 落本地存储」的降级，
     * 所以只要拿到 docId 就算成功，并在提示里区分是否真正到了远端。
     */
    async saveCrushChartToDocCenter() {
      if (!this.crushChartTracks.length) {
        this.$message.warning('暂无图表数据可保存')
        return
      }
      this.chartSaving = true
      try {
        const blob = await this._crushChartToBlob()
        if (!blob) {
          this.$message.error('图表尚未绘制完成，请稍后重试')
          return
        }
        const filename = this._crushChartFileName()
        // Blob → File：uploadWellDoc 内部用 FormData.append，File 才带文件名，
        // 直接传 Blob 会让后端拿到 "blob" 而没有 .png 扩展名，落库后预览/下载都认不出类型
        const file = new File([blob], filename, { type: 'image/png' })
        const res = await uploadWellDoc(
          this.wbWellId,
          file,
          {
            docType: 'GENERATED_REPORT',
            wellName: this.wellName || undefined,
            remark: '射孔方案智能生成 - 图 1 煤岩破碎指数多道曲线'
          }
        )
        const doc = (res && res.data) || {}
        if (doc.docId) {
          this.$message.success(`已保存到文档中心：${filename}`)
        } else {
          // 接口 200 但没有 docId：多半是后端返回了业务错误体，如实提示
          const msg = (res && res.message) || '未返回文档编号'
          this.$message.error(`保存到文档中心失败：${msg}`)
        }
      } catch (e) {
        const msg = (e && e.response && e.response.data && e.response.data.message)
          || (e && e.message) || '网络错误'
        this.$message.error({ message: `保存到文档中心失败：${msg}`, duration: 6000 })
      } finally {
        this.chartSaving = false
      }
    },

    /** 数字格式化：null/undefined 显示 '-'，否则保留 n 位 */
    fmtNum(v, n) {
      if (v === null || v === undefined || v === '') return '-'
      const num = Number(v)
      if (isNaN(num)) return v
      return num.toFixed(n)
    },

    /** 破碎指数表行样式：MSE 越界（超过阈值）标黄，便于人工复核 */
    crushRowClassName({ row }) {
      const th = Number(this.params.mseThreshold)
      if (!th || row.mseValue === null || row.mseValue === undefined) return ''
      return Number(row.mseValue) > th ? 'pa-row--mse' : ''
    },

    // ==================== 图 1：用户上传图片（2026-11-14） ====================

    /**
     * 选择本地图片文件（隐藏的 <input type=file>，避免引入额外组件）。
     *
     * 为什么不用 el-upload：这里只需要「选一个文件 → 立刻上传 → 回填」，
     * 不需要文件列表、不需要多选、不需要拖拽，el-upload 的样式和
     * :auto-upload / on-success 链条反而更绕；原生 input 一行搞定。
     */
    pickCrushChartImage() {
      if (this.crushChartUploading) return
      const input = document.createElement('input')
      input.type = 'file'
      // 只收图片；accept 在部分浏览器可被用户改成「所有文件」，提交前再校验一次
      input.accept = 'image/png,image/jpeg,image/jpg,image/bmp,image/webp'
      input.style.display = 'none'
      input.onchange = () => {
        const file = input.files && input.files[0]
        document.body.removeChild(input)
        if (file) this.uploadCrushChartImage(file)
      }
      document.body.appendChild(input)
      input.click()
    },

    /**
     * 上传用户选的图片到文档中心，成功后把它记为「当前显示的图」。
     *
     * 注意这里**只是上传 + 内存里记 docId**，不落库：
     * 真正入库发生在点「保存修改」时（saveTables 带 crushChartDocId 一起提交），
     * 和两张表格的编辑语义保持一致 —— 用户可能传错了想换一张再存，
     * 每传一次就写一个版本会把版本号打乱。
     */
    async uploadCrushChartImage(file) {
      // 前端先做一次轻校验：非图片直接拒，免得传上去后端存成个坏文件
      if (!/^image\//i.test(file.type || '')) {
        this.$message.error('请选择图片文件（png / jpg / bmp / webp）')
        return
      }
      // 10MB 上限：这是一张曲线图，正常几十 KB～几百 KB，
      // 超过 10MB 基本是用户选错了文件（比如整份扫描 PDF 转的图），拦一下更友好
      if (file.size > 10 * 1024 * 1024) {
        this.$message.error('图片过大（超过 10MB），请压缩后再上传')
        return
      }
      if (!this.wbWellId) {
        this.$message.error('未获取到井号，无法上传')
        return
      }

      this.crushChartUploading = true
      try {
        const res = await uploadWellDoc(this.wbWellId, file, {
          docType: 'GENERATED_REPORT',
          wellName: this.wellName || undefined,
          remark: '射孔方案智能生成 - 图 1 煤岩破碎指数图（用户上传）'
        })
        const doc = (res && res.data) || {}
        const docId = doc.docId || doc.fileId
        if (!docId) {
          const msg = (res && res.message) || '未返回文档编号'
          this.$message.error(`图片上传失败：${msg}`)
          return
        }
        await this._setCrushChartUpload(docId, file.name)
        this.$message.success('图片已上传，点「保存修改」后随版本一起保存')
      } catch (e) {
        const msg = (e && e.response && e.response.data && e.response.data.message)
          || (e && e.message) || '网络错误'
        this.$message.error({ message: `图片上传失败：${msg}`, duration: 6000 })
      } finally {
        this.crushChartUploading = false
      }
    },

    /**
     * 把 docId 变成可显示的图片（拉 preview 二进制 → objectURL）。
     *
     * 为什么不用 `url = /v1/workbench/well/doc/{docId}/preview` 直接塞给 <img>：
     * preview 接口要求带 Authorization 头，<img src> 发的是无头请求 → 401。
     * 所以统一走 previewWellDoc（axios + responseType=blob）再转 objectURL。
     *
     * ⚠️ objectURL 必须自己 revoke，否则每切换一次图就泄漏一份内存；
     * 这里在替换新 url 前先释放旧的。
     */
    async _setCrushChartUpload(docId, fileName) {
      const url = await this._loadCrushChartObjectUrl(docId)
      const old = this.crushChartUpload && this.crushChartUpload.url
      if (old && old.startsWith('blob:')) window.URL.revokeObjectURL(old)
      this.crushChartUpload = { docId, fileName: fileName || '', url }
      // 刚上传/刚回填时默认让用户看到这张图
      this.crushChartShowAuto = false
    },

    /** 按 docId 拉图片并转 objectURL；失败时给一个空串（模板里 img 会显示破图占位） */
    async _loadCrushChartObjectUrl(docId) {
      try {
        const { blob, fileName } = await previewWellDoc(docId)
        if (!blob || !blob.size) throw new Error('返回内容为空')
        // 借道把服务端文件名带出来（回填老数据时 fileName 字段可能为空）
        if (!this.crushChartUpload || !this.crushChartUpload.fileName) {
          this._crushChartRemoteName = fileName || ''
        }
        return window.URL.createObjectURL(blob)
      } catch (e) {
        const msg = (e && e.message) || '图片加载失败'
        this.$message.warning(`破碎指数图加载失败：${msg}`)
        return ''
      }
    },

    /**
     * 从已保存的表格记录里回填上传图。
     *
     * 记录结构（后端 PerforationTableRecord）：
     *   { crushChartDocId, crushChartFileName, ... }
     * 两字段都为空 → 该版本没传过图，什么都不做（保持自动图）。
     */
    async restoreCrushChartFromRecord(rec) {
      if (!rec) return
      const docId = rec.crushChartDocId
      if (!docId) {
        // 该版本没有上传图：清掉上一口井/上一版残留的图，避免串图
        if (this.crushChartUpload) {
          const old = this.crushChartUpload.url
          if (old && old.startsWith('blob:')) window.URL.revokeObjectURL(old)
          this.crushChartUpload = null
          this.crushChartShowAuto = false
        }
        return
      }
      // 同一个 docId 已经加载过就不重复拉
      if (this.crushChartUpload && this.crushChartUpload.docId === docId) return

      this.crushChartUploading = true
      try {
        const url = await this._loadCrushChartObjectUrl(docId)
        const old = this.crushChartUpload && this.crushChartUpload.url
        if (old && old.startsWith('blob:')) window.URL.revokeObjectURL(old)
        this.crushChartUpload = {
          docId,
          fileName: rec.crushChartFileName || this._crushChartRemoteName || '',
          url
        }
        this.crushChartShowAuto = false
      } finally {
        this.crushChartUploading = false
      }
    },

    /** 移除已上传的图，回到系统自动绘制 */
    removeCrushChartUpload() {
      if (!this.crushChartUpload) return
      this.clearCrushChartUpload()
      this.$message.info('已切换回系统自动生成的图（点「保存修改」后生效）')
      this.$nextTick(() => this.renderCrushChart())
    },

    /**
     * 静默清空已上传的图（释放 objectURL + 复位标记），不弹提示。
     * 重新生成 / 切换井时调用 —— 那些场景下提示是噪音。
     */
    clearCrushChartUpload() {
      if (this.crushChartUpload) {
        const old = this.crushChartUpload.url
        if (old && old.startsWith('blob:')) window.URL.revokeObjectURL(old)
      }
      this.crushChartUpload = null
      this.crushChartShowAuto = false
      this._crushChartRemoteName = ''
    },

    copyData() {
      if (!this.result || !this.result.segments || !this.result.segments.length) {
        this.$message.warning('暂无数据可复制')
        return
      }
      const lines = this.result.segments.map(s => {
        const adjust = s.mseAdjusted ? '【MSE优化】' : (s.packerAdjusted ? '【避让】' : '')
        return `段${s.segmentNo}: ${s.startDepth}~${s.endDepth}m, 簇${s.clusters}, ${adjust}`
      })
      const text = lines.join('\n')
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制到剪贴板')
      }).catch(() => {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        this.$message.success('已复制到剪贴板')
      })
    },

    /**
     * 返回单井工作台。
     * 注意：params.wellId 是「井库 ID」，query.wbWellId 才是「工作台井号 ID」，
     * 二者不是同一个值。把 wbWellId 当 wellId 传会让单井页去查井库并报「井不存在」。
     * 井号未关联井库时（wellId 为空），用 local~<wbWellId> 打头的离线 ID，
     * 与 index.vue 的 openWell 保持一致。
     */
    goBack() {
      if (!this.wbWellId) {
        this.$router.push({ name: 'Workbench' })
        return
      }
      const wellId = this.resolveWellId()
      this.$router.push({
        name: 'WellWorkbench',
        params: { wellId: wellId || `local~${this.wbWellId}` },
        query: { wbWellId: this.wbWellId }
      })
    },

    /**
     * 从 sessionStorage 里读当前井号的井库 ID（working bench 跳转时写入）。
     *
     * <p>必须排除「值其实是井名」的情况：历史上智能体页的 goEditor() 曾把井名
     * 当 wellId 写进存储，取出来直接当井库 ID 用会让单井页请求
     * {@code /v1/wells/安13-7-3平3}、后端返回「井不存在」。
     * 丢空后调用方会退化成本地井 {@code local~<wbWellId>}，不会报错。</p>
     */
    resolveWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && o.wbWellId === this.wbWellId && o.wellId) {
            const id = String(o.wellId).trim()
            if (id && !isWellNameLike(id)) return id
          }
        }
      } catch (e) {
        // 忽略解析失败
      }
      return ''
    },

    /**
     * 把当前选中的井号同步到 Vuex + sessionStorage。
     * 返回单井工作台时，离线模式用 store 里的 wellName 做标题兜底，
     * 井库 ID 也从 wbSelectedWell 里取，因此两处都要写。
     */
    syncSelectedWell() {
      if (!this.wbWellId) return
      const wellId = this.resolveWellId()
      this.$store.commit('well/SET_SELECTED_WELL', {
        wellId,
        wellName: this.wellName || '',
        block: '',
        wellType: ''
      })
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: this.wbWellId,
          wellId,
          wellName: this.wellName || '',
          userId: ''
        }))
      } catch (e) {
        // 忽略存储失败
      }
    }
  }
}

/**
 * 判断一个字符串「像井名」而不是「井库 ID」。
 *
 * <p>井名形态：「安13-7-3平3」；井库 ID 形态：「HB00022534」。
 * 历史上出现过井名被写进 {@code wellId} 字段，再被当成井库 ID 去查
 * {@code /v1/wells/{id}}，后端返回「井不存在」。判定口径刻意宽松：
 * 井库 ID 不含中文、不以「井」结尾、不带空格。</p>
 *
 * @param {String} s 待判定值
 * @returns {Boolean} true = 看起来是井名，不能当井库 ID 用
 */
function isWellNameLike(s) {
  const v = String(s == null ? '' : s).trim()
  if (!v) return true
  if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(v)) return true
  if (/井$/.test(v)) return true
  if (/\s/.test(v)) return true
  return false
}
</script>

<style lang="scss" scoped>
.pa-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

/* ---------- 顶部 ---------- */
.pa-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fff7e6 0%, #fffbf0 100%);
  border: 1px solid #ffe7ba;
  flex: none;

  &__left { display: flex; align-items: center; gap: 14px; }
  &__icon {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #fa8c16; color: #fff; font-size: 22px;
  }
  &__title { font-size: 16px; font-weight: 600; color: #1f2d3d; display: flex; align-items: center; gap: 8px; }
  &__meta { margin-top: 4px; font-size: 12px; color: #7a8699; display: flex; gap: 16px; }
  &__actions { display: flex; gap: 8px; }
}

/* ---------- 主体两栏 ---------- */
.pa-body {
  flex: 1;
  min-height: 0;
  display: grid;
  /* 左栏自适应（窄屏收窄）+ 内容超长时不再把操作按钮挤到屏幕外 */
  grid-template-columns: clamp(280px, 26vw, 360px) minmax(0, 1fr);
  gap: 12px;
}

/* ---------- 左：配置 ---------- */
.pa-config {
  min-height: 0;
  /* 滚动交给内部 .pa-config__scroll；这里再给一层保险，
     内容极端超高时整列仍可滚，而不是被 .pa-page 的 overflow:hidden 直接裁掉 */
  overflow-y: auto;

  /* el-card 默认是 block，height:100% 时内部 body 会被内容顶高、溢出裁切。
     改成纵向 flex，让 body 成为 flex 容器，header 定高、body 撑满剩余高度 */
  &__card {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid #e8e8e8;
    border-radius: 6px;

    ::v-deep .el-card__body {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      /* el-card 默认 padding 20px，底部由 .pa-actions 自己留白 */
      padding: 16px 18px 12px;
    }
  }

  /* 只有这块滚，操作按钮固定在下方 */
  &__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* 留出滚动条宽度，避免最后一行文字被压住 */
    padding-right: 2px;
  }

  &__header {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    i { color: #fa8c16; margin-right: 4px; }
  }
}

.pa-section {
  margin-bottom: 16px;

  &__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
    padding-left: 6px;
    border-left: 3px solid #fa8c16;
  }

  &__reload {
    padding: 0;
    font-weight: 400;
    font-size: 12px;
  }
}

/* 材料自动带入提示 */
.pa-autofill {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-bottom: 6px;
  padding: 6px 9px;
  border-radius: 4px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  font-size: 12px;
  line-height: 1.55;
  color: #529b2e;

  i {
    margin-top: 2px;
  }
}

/* 必填材料齐全状态位 */
.pa-ready {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  padding: 5px 9px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;

  &--ok {
    background: #f0f9eb;
    border: 1px solid #c2e7b0;
    color: #529b2e;
  }

  &--pending {
    background: #fdf6ec;
    border: 1px solid #faecd8;
    color: #b88230;
  }
}

.pa-checklist {
  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child { border-bottom: none; }
  }
}

/* 设计文档提示行 */
.pa-doc-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed #ebeef5;

  &__text {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 复用来源说明：允许换行 */
  &--tip {
    border-top: none;
    padding-top: 2px;

    .pa-doc-hint__text {
      white-space: normal;
      color: #a8abb2;
    }
  }
}

.pa-unit {
  margin-left: 6px;
  font-size: 12px;
  color: #909399;
}

/* MSE 阈值是无量纲的，单位位改成灰字说明，避免和上下两个「m」看起来同类 */
.pa-unit--dimen {
  font-size: 11px;
  color: #c0c4cc;
}

/*
 * 参数行的补充说明。
 *
 * 三个参数挤在一栏里，若不解释，用户无法判断「避让 2m」「偏移 4m」「阈值 10」
 * 之间是什么关系（前两个是米、第三个不是）。这里每行一句，讲清各自约束什么。
 * el-form-item 默认是 flex 单行，说明文字要独占一行 → 撑满并换行。
 */
.pa-params .pa-param-hint {
  flex: 0 0 100%;
  width: 100%;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: #b1b3b8;
}

.pa-params .el-form-item__content {
  flex-wrap: wrap;
}

.pa-actions {
  display: flex;
  gap: 8px;
  flex: none;
  /* 固定在卡片底部：上面加分隔线，滚动内容不会和按钮粘在一起 */
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

/* ---------- 右：结果 ---------- */
.pa-result {
  min-height: 0;
  overflow: hidden;

  &__card {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
  }
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    i { color: #fa8c16; margin-right: 4px; }
  }
  &__stats {
    display: flex;
    gap: 6px;
  }
  &__body {
    flex: 1;
    min-height: 0;
    /* 有结果时滚动交给内部 el-tabs__content（每个 tab 单独滚），
       这里只兜空状态 / 生成中提示；否则两层滚动条叠在一起会互相抢滚轮 */
    overflow: auto;
    display: flex;
    flex-direction: column;

    /* 空状态、生成中提示需要自己居中，不能被 flex 压扁 */
    > .el-empty,
    > .pa-generating {
      flex: 1;
    }
  }
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed #ebeef5;
  }
  &__buttons {
    display: flex;
    gap: 8px;
  }
}

.pa-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: #909399;
  font-size: 14px;

  i { font-size: 28px; color: #fa8c16; }
}

.pa-table-wrap {
  ::v-deep .pa-row--normal {
    background-color: #f0f9ff !important;
  }
  ::v-deep .pa-row--mse {
    background-color: #fffbe6 !important;
  }
  ::v-deep .pa-row--packer {
    background-color: #fff1f0 !important;
  }

  /* 表 2 与表 1 之间留出呼吸间距 */
  &--crush {
    margin-top: 16px;
  }
}

/* ---------- 模板制式表（两行表头 + 合并单元格） ---------- */
/*
 * 表 1 / 表 2 严格照《压裂工程设计》模板的表格形态：
 *  · 两行表头：「射孔井段（m）」colspan=2 横跨「顶深/底深」，其余列 rowspan=2 上下合并
 *  · 全框线、表头浅灰底、正文居中（数字右对齐）
 *  · 长表在固定高度内滚动，表头 sticky 常驻
 * 为什么不用 el-table：它的表头只有一行，多级表头要嵌套 column，
 * 嵌套后列宽/fixed 都会失真，也表达不了模板这种「同名列上下合并」的形态。
 */
.pa-sheet {
  max-height: 440px;
  overflow: auto;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  background: #fff;

  &__table {
    width: 100%;
    border-collapse: separate;   /* sticky 表头需要 separate */
    border-spacing: 0;
    table-layout: fixed;
    font-size: 12px;
    color: #354052;

    th,
    td {
      padding: 5px 6px;
      border-right: 1px solid #dcdfe6;
      border-bottom: 1px solid #dcdfe6;
      line-height: 1.4;
      word-break: break-all;

      &:last-child { border-right: none; }
    }

    thead th {
      position: sticky;
      z-index: 3;
      background: #f5f7fa;
      font-weight: 600;
      color: #303133;
      text-align: center;
      white-space: nowrap;
      /*
       * ⚠️ 只给 th 设 sticky 不够：Chromium 里 <table> 的行框会把同 tr 内的
       * sticky th 一起带走，滚动后表头照样滚出可视区（实测滚动 500px 后
       * th 跑到 -179px，与容器 top 差 499px）。
       * 必须让 thead **整体** sticky，同时 th 保留 sticky 才能兼容各浏览器。
       * thead sticky 只在 border-collapse: separate 下生效，勿改成 collapse。
       */
      top: 0;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 3;
    }
    /* 第二行（顶深/底深）贴在首行下方：首行 th 实测高 28px + 1px 边框 */
    thead tr:nth-child(2) th { top: 29px; }

    tbody td {
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }

    td.is-center { text-align: center; }
    td.is-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* 只读列（分段号由分段序号生成，不参与编辑） */
    td.is-ro {
      background: #fafafa;
      color: #909399;
    }

    /*
     * 单元格内嵌 el-input：默认 el-input 有 1px 边框 + 内边距，
     * 贴进 6px padding 的 td 里会把行高撑到 40px+，一屏只能看 8 行。
     * 这里把边框和内边距全部抹掉，视觉上退化成「文本」，
     * 悬停/聚焦时才显示边框，提示「这格能改」。
     */
    .pa-cell {
      width: 100%;

      ::v-deep .el-input__inner {
        height: 22px;
        line-height: 22px;
        padding: 0 2px;
        border-color: transparent;
        background: transparent;
        font-size: 12px;
        color: inherit;
        text-align: inherit;

        &:hover { border-color: #c0c4cc; }
        &:focus { border-color: #409eff; background: #fff; }
      }
    }
    /* 破碎指数列：保留结论量的强调色 */
    td .pa-cell--idx ::v-deep .el-input__inner {
      font-weight: 600;
      color: #d64541;
    }
  }

  &__empty {
    padding: 22px 0 !important;
    text-align: center;
    color: #a8abb2;
  }

  /* 行状态色：与 el-table 版本保持一致 */
  .pa-row--normal { background-color: #f0f9ff; }
  .pa-row--mse { background-color: #fffbe6; }
  .pa-row--packer { background-color: #fff1f0; }
}

/* ---------- 煤岩破碎指数多道图（对齐「图片1」测井多道图风格） ---------- */
/* 空状态容器：图无数据时给「上传图片 / 重新解析曲线」两个入口，避免只剩一句无数据的死路 */
.pa-crush-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 20px;

  &__btns {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
}
.pa-crush-chart {
  margin-bottom: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 4px;
  background: #f8f9fb;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    background: #fff;
    border-bottom: 1px solid #eef0f3;
  }
  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #354052;
    i { color: #e6a23c; margin-right: 4px; }
  }
  &__meta {
    font-size: 11px;
    color: #98a2b3;
  }

  /* canvas 容器相对定位，浮层用绝对定位挂在上层 */
  &__canvas-box {
    position: relative;
    line-height: 0;
    overflow: hidden;
  }
  /*
   * 用户上传图片的容器：居中 + 顶部留白，避免图片黏在标题条上；
   * max-height 给个上限，超长扫描图不至于把页面撑到十几屏，
   * object-fit: contain 保证不拉伸变形（宽高比守恒）。
   */
  &__canvas-box--img {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: #fff;
    min-height: 240px;
  }
  &__uploaded {
    display: block;
    max-width: 100%;
    max-height: 720px;
    object-fit: contain;
  }
  &__canvas {
    display: block;
    width: 100%;
    cursor: crosshair;
  }

  /* hover 数据浮层 */
  &__tip {
    position: absolute;
    z-index: 5;
    min-width: 150px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.97);
    border: 1px solid #dcdfe6;
    border-radius: 3px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    font-size: 11px;
    line-height: 1.7;
    color: #354052;
    pointer-events: none;
    line-height: 1.6;
  }
  &__tip-md {
    font-weight: 600;
    color: #1d6fd4;
    margin-bottom: 2px;
    border-bottom: 1px dashed #e6e8ec;
    padding-bottom: 2px;
  }
  &__tip-row {
    display: flex;
    align-items: center;
  }
  &__tip-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 5px;
    flex: 0 0 auto;
  }
  &__tip-name {
    color: #6b7480;
    flex: 1 1 auto;
    margin-right: 10px;
  }
  &__tip-val {
    color: #354052;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  /* 图 1 单独占一个标签页时：不再需要给下面的表 2 留间距，
     也去掉外框（标签页里已经有分隔感），宽度吃满内容区、高度自适应 */
  &--solo {
    margin-bottom: 0;
    border: none;
    border-radius: 0;
    background: transparent;

    /*
     * 标题条已改用与表 1 / 表 2 一致的 .pa-table-title（橙色左边框）。
     * 这里把它的右侧按钮组稍微收一点：图页签只有「下载图片 / 保存到文档中心」
     * 两个按钮，不像表页签还有一长串提示文案，收紧避免按钮被挤到换行。
     */
    .pa-table-title {
      margin-bottom: 8px;

      &__right {
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    }
  }
}

/* ---------- 结果区标签页（表 1 / 图 1 / 表 2） ---------- */
.pa-result__tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  /* el-tabs 默认 header 40px、content 撑开；这里让 content 吃掉剩余高度 */
  ::v-deep .el-tabs__header {
    margin: 0 0 8px;
    flex: 0 0 auto;
  }
  ::v-deep .el-tabs__content {
    flex: 1;
    min-height: 0;
    /* 每个 tab 单独滚，而不是整个 body 一起滚 —— 
       保证切到「表 2」时直接看到表 2 顶部，不用再往下找 */
    overflow: auto;
  }
  ::v-deep .el-tab-pane {
    height: 100%;
  }
  ::v-deep .el-tabs__item {
    height: 36px;
    line-height: 36px;
    font-size: 13px;
  }

  /* tab 标题上的数量徽标：压在文字右上角，不额外占宽 */
  .pa-tab-badge {
    margin-left: 4px;
    vertical-align: middle;
    ::v-deep .el-badge__content {
      position: static;
      transform: none;
      height: 16px;
      line-height: 16px;
      padding: 0 5px;
      font-size: 11px;
      border: none;
    }
  }
}

/* 每张表上方的标题条 */
.pa-table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding-left: 6px;
  border-left: 3px solid #fa8c16;
  font-size: 13px;
  font-weight: 600;
  color: #303133;

  i {
    color: #fa8c16;
    margin-right: 4px;
  }

  &__hint {
    font-size: 12px;
    font-weight: 400;
    color: #909399;
  }

  &__note {
    color: #b0b3b8;
  }

  /* 右侧：提示文案 + 单表导出按钮 */
  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__export {
    padding: 5px 10px;
    font-weight: 400;
  }

  /* 表头保存按钮：与「导出 Excel」并排，高亮提示未保存的改动 */
  &__save {
    padding: 5px 10px;
    font-weight: 400;
  }
}

/*
 * 图表来源标识（2026-11-14）：紧跟在「图 1　煤岩破碎指数多道曲线」后面。
 *   · 已上传图片 → 橙色（提示这是用户自己的图，不会被系统重算覆盖）
 *   · 系统自动生成 → 灰色（默认态，压低视觉权重）
 */
.pa-chart-mode {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 400;
  color: #e6a23c;

  &--auto {
    color: #909399;
  }
}

/* 破碎指数数值强调 */
.pa-crush-idx {
  font-weight: 600;
  color: #d46b08;
  font-variant-numeric: tabular-nums;
}

/* 已保存提示 */
.pa-saved-tip {
  margin-left: 4px;
  font-size: 12px;
  color: #529b2e;

  i {
    margin-right: 2px;
  }
}

.pa-reason {
  font-size: 12px;
  &--mse { color: #fa8c16; }
  &--packer { color: #f5222d; }
}

.pa-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #606266;

  &__dot {
    display: inline-block;
    width: 10px; height: 10px; border-radius: 50%;
    margin-right: 2px;
  }
  &__dot--blue { background: #1890ff; }
  &__dot--yellow { background: #faad14; }
  &__dot--red { background: #f5222d; }

  /* 同时被 MSE 与接箍调整过的段（只计入 MSE 那一块，这里补充说明） */
  &__both {
    color: #b1b3b8;
    font-size: 11px;
  }

  /* 总段数：给用户一个核对基准，让「三项相加 == 总数」自证 */
  &__total {
    margin-left: auto;
    color: #909399;
  }
}

</style>
