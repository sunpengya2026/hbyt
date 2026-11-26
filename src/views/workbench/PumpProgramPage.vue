<template>
  <div class="pp-page">
    <!-- 顶部：井信息 + 操作 -->
    <div class="pp-hero">
      <div class="pp-hero__left">
        <div class="pp-hero__icon"><i class="el-icon-s-marketing"></i></div>
        <div>
          <div class="pp-hero__title">
            泵注程序编写
            <!--
              段数来源标签：业务口径是「地质设计压裂点参数表有几段就生成几段」，
              所以优先显示地质设计；取不到才回落射孔方案，并把回落的真实原因摆出来。
            -->
            <el-tag v-if="geoStageLoaded" size="mini" type="success" effect="plain">
              段数取自地质设计压裂点参数表（{{ geoStages.length }} 段）
            </el-tag>
            <el-tag v-else-if="perfLoaded" size="mini" type="warning" effect="plain">
              未取到地质设计段数，暂用射孔方案（{{ perfStages.length }} 段）
            </el-tag>
            <el-tag v-else size="mini" type="info" effect="plain">按手填段数</el-tag>
            <el-tag v-if="savedVersion" size="mini" type="info" effect="plain">
              已保存 第 {{ savedVersion }} 版
            </el-tag>
          </div>
          <div class="pp-hero__meta">
            <span>井号：{{ wellName || '-' }}</span>
            <span>段数：{{ stageCount }} 段（共 {{ stageCount }} 张泵注表）</span>
            <span v-if="refStageCount">
              <i class="el-icon-connection"></i> {{ refStageCount }} 段引用其他段
            </span>
          </div>
          <!-- 段数来源明细：只在不一致或回落时出现，正常情况不打扰 -->
          <div v-if="stageSourceHint" class="pp-hero__source">
            <i class="el-icon-info"></i> {{ stageSourceHint }}
          </div>
        </div>
      </div>
      <div class="pp-hero__actions">
        <el-button
          v-if="autoDoc && !autoLoading"
          size="small"
          icon="el-icon-refresh"
          :loading="uploadLoading"
          @click="reloadAutoDoc"
        >重新读取工作台泵注表</el-button>
        <el-button size="small" icon="el-icon-refresh-right" :loading="perfLoading || geoStageLoading" @click="reloadStageSource">
          重新读取段数与桥塞位置
        </el-button>
        <el-button size="small" icon="el-icon-refresh-left" @click="resetAll">恢复默认</el-button>
        <el-button size="small" type="primary" icon="el-icon-check" :loading="saving" @click="saveAll">
          保存
        </el-button>
        <el-button size="small" icon="el-icon-arrow-left" @click="goBack">返回工作台</el-button>
      </div>
    </div>

    <!-- 状态提示 -->
    <el-alert v-if="autoLoading" title="正在读取工作台上传的泵注表…" type="info" :closable="false" show-icon class="pp-auto" />
    <el-alert v-else-if="autoError" :title="autoError" type="error" :closable="false" show-icon class="pp-auto" />
    <el-alert v-else-if="autoWordHint" :title="autoWordHint" type="warning" :closable="false" show-icon class="pp-auto" />

    <div class="pp-body">
      <!-- ================= 左：段配置（原参数卡已移除） ================= -->
      <div class="pp-side">
        <!-- 段配置表：段数、每段桥塞深度、复制来源、本段上传/导出 -->
        <el-card shadow="never" class="pp-card pp-card--stages">
          <div slot="header" class="pp-card__header pp-card__header--flex">
            <span><i class="el-icon-s-operation"></i> 段配置</span>
            <div class="pp-stageadd">
              <el-input-number v-model="stageCountInput" :min="1" :max="30" size="mini"
                               controls-position="right" style="width: 92px" @change="onStageCountChange" />
              <span class="pp-stageadd__label">段</span>
            </div>
          </div>

          <div class="pp-stagehint">
            <template v-if="geoStageLoaded">
              <b>段数</b>取自地质设计「压裂点参数表」（按「分段」列去重）；
              <b>桥塞位置</b>取自「分段射孔方案」的封隔器位置，射孔方案还没保存时需手工填。
              第 1 段是首段，没有泵送桥塞工序，桥塞位置留空即正常。
            </template>
            <template v-else-if="perfLoaded">
              未取到地质设计段数（{{ geoStageMessage || '原因未知' }}），暂按「分段射孔方案」的
              {{ perfStages.length }} 段；桥塞位置取该方案里封隔器位置（第 1 段无桥塞）。
            </template>
            <template v-else>
              既没取到地质设计段数，也没在射孔方案里保存过，段数与桥塞深度可手工填。
            </template>
          </div>

          <!-- 每段的数据行：上传覆盖本段 / 导出本段 -->
          <el-table :data="stageDefs" size="mini" border class="pp-stagetable" max-height="420">
            <el-table-column prop="stageNo" label="段" width="44" align="center">
              <template slot-scope="scope">
                <span class="pp-stageno" :class="{ 'is-ref': scope.row.refStageNo }">{{ scope.row.stageNo }}</span>
              </template>
            </el-table-column>
            <el-table-column label="桥塞位置(m)" width="96" align="right">
              <template slot-scope="scope">
                <!--
                  首段没有「泵送桥塞」工序（射孔方案首段也不给封隔器位置），
                  值恒为 0，直接显示成 0 会被当成「桥塞在井口」这种真实深度。
                  这里只在显示上留空并给出提示，值本身仍是 0（公式里按 2 m³ 兜底），
                  不改内部语义 —— plugDepth 在十几处都按「数字，0=未填」用。
                -->
                <el-input
                  :value="scope.row.stageNo === 1 && !scope.row.plugDepth ? '' : scope.row.plugDepth"
                  size="mini"
                  class="pp-cell-input"
                  :placeholder="scope.row.stageNo === 1 ? '首段无' : '未填'"
                  @change="onPlugDepthEdit(scope.row.stageNo, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="复制来源" width="132">
              <template slot-scope="scope">
                <el-select
                  :value="scope.row.refStageNo || 0"
                  size="mini"
                  class="pp-refsel"
                  :class="{ 'pp-ref-select': scope.row.refStageNo }"
                  @change="onRefChange(scope.row.stageNo, $event)"
                >
                  <el-option :value="0" label="本段自带" />
                  <el-option
                    v-for="s in refCandidates(scope.row.stageNo)"
                    :key="s.stageNo"
                    :value="s.stageNo"
                    :label="'同第 ' + s.stageNo + ' 段'"
                  />
                </el-select>
              </template>
            </el-table-column>
            <!--
              每段的数据动作。
              ⚠️ 上传是「覆盖本段」而非「整表导入」：解析出来的行只填这一段，
                 其他段一律不动 —— 用户给某一段换一份施工表时不会误伤别的段。
            -->
            <el-table-column label="数据" width="118" align="center">
              <template slot-scope="scope">
                <div class="pp-rowops">
                  <el-tooltip
                    content="上传 Excel 覆盖本段数据"
                    placement="top"
                    :open-delay="400"
                  >
                    <el-button
                      type="text"
                      size="mini"
                      class="pp-rowops__btn"
                      :loading="rowUploading === scope.row.stageNo"
                      @click="pickRowFile(scope.row.stageNo)"
                    >
                      <i class="el-icon-upload2"></i>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    content="从 Excel 复制后点击此处粘贴（Ctrl+V 也可）"
                    placement="top"
                    :open-delay="400"
                  >
                    <el-button
                      type="text"
                      size="mini"
                      class="pp-rowops__btn pp-rowops__btn--paste"
                      @click="openPaste(scope.row.stageNo)"
                    >
                      <i class="el-icon-document-copy"></i>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    content="导出本段为 Excel"
                    placement="top"
                    :open-delay="400"
                  >
                    <el-button
                      type="text"
                      size="mini"
                      class="pp-rowops__btn"
                      @click="exportStage(scope.row.stageNo)"
                    >
                      <i class="el-icon-download"></i>
                    </el-button>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="pp-batchbar">
            <el-select v-model="batchRefFrom" size="mini" style="width: 118px" placeholder="批量复制">
              <el-option :value="0" label="全部改为自带" />
              <el-option v-for="s in refCandidates(null)" :key="s.stageNo" :value="s.stageNo"
                         :label="'全部同第 ' + s.stageNo + ' 段'" />
            </el-select>
            <el-button size="mini" @click="applyBatchRef">应用</el-button>
            <div class="pp-batchbar__right">
              <el-button size="mini" icon="el-icon-upload2" @click="pickRowFile(activeStage)">
                上传覆盖第 {{ activeStage }} 段
              </el-button>
              <el-button size="mini" icon="el-icon-document-copy" @click="openPaste(activeStage)">
                粘贴第 {{ activeStage }} 段
              </el-button>
              <el-button size="mini" icon="el-icon-download" @click="exportStage(activeStage)">
                导出第 {{ activeStage }} 段
              </el-button>
            </div>
          </div>

          <!-- 段配置下的说明：数据一律来自上传或粘贴 -->
          <div class="pp-paramnote">
            <i class="el-icon-info"></i>
            泵注数据来自「上传 Excel」或「从 Excel 复制后粘贴」：没有数据的段显示为空，
            两种方式都只改当前段。每段也可单独导出一份带走。
          </div>
        </el-card>
      </div>

      <!-- ================= 右：表格区 ================= -->
      <div class="pp-main">
        <el-card shadow="never" class="pp-card pp-card--table">
          <div slot="header" class="pp-card__header pp-card__header--flex">
            <span><i class="el-icon-s-grid"></i> 泵注程序表</span>
            <div class="pp-tablebar">
              <div class="pp-tabs">
                <span
                  v-for="s in allStages"
                  :key="s.stageNo"
                  class="pp-tabs__item"
                  :class="{ 'is-active': s.stageNo === activeStage, 'is-ref': s.resolvedFrom }"
                  :title="s.resolvedFrom ? ('同第 ' + s.resolvedFrom + ' 段') : ''"
                  @click="activeStage = s.stageNo"
                >
                  第 {{ s.stageNo }} 段
                  <i v-if="s.resolvedFrom" class="el-icon-link pp-tabs__link"></i>
                </span>
              </div>
              <div class="pp-tablebar__ops">
                <el-button
                  size="mini"
                  icon="el-icon-upload2"
                  :loading="rowUploading === activeStage"
                  @click="pickRowFile(activeStage)"
                >上传覆盖本段</el-button>
                <el-button size="mini" icon="el-icon-document-copy" @click="openPaste(activeStage)">
                  从 Excel 粘贴
                </el-button>
                <el-button size="mini" icon="el-icon-download" @click="exportStage(activeStage)">
                  导出本段
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="!current" class="pp-empty">
            <i class="el-icon-warning-outline"></i>
            <p>暂无数据，请在左侧调整段数</p>
          </div>

          <template v-else>
            <!-- 引用提示条：说明这张表的数据是从哪段来的 -->
            <div v-if="current.resolvedFrom" class="pp-refbar">
              <i class="el-icon-connection"></i>
              <span class="pp-refbar__text">
                第 {{ current.stageNo }} 段
                <b>泵注程序同第 {{ current.resolvedFrom }} 段</b>
                （桥塞位置 {{ current.plugDepth || '-' }} m），顶替液已按本段深度重算为
                <b>{{ current.summary.flush }}</b> m³。
                文档中会合并为一句说明，本段不单独出表。
              </span>
              <el-button type="text" size="mini" @click="breakRef(current.stageNo)">改为自带</el-button>
            </div>
            <div v-else-if="referencedBy(current.stageNo).length" class="pp-refbar pp-refbar--src">
              <i class="el-icon-share"></i>
              <span class="pp-refbar__text">
                第 {{ referencedBy(current.stageNo).join('、') }} 段的泵注程序复制自本段，
                改这里会同步影响它们（顶替液仍按各自桥塞深度单独算）。
              </span>
            </div>

            <!-- 空段：还没有任何数据，两个入口 —— 上传文件 / 从 Excel 粘贴 -->
            <div v-if="!current.rows.length" class="pp-nodata">
              <i class="el-icon-document-add"></i>
              <p class="pp-nodata__title">第 {{ current.stageNo }} 段还没有泵注数据</p>
              <p class="pp-nodata__hint">
                在 Excel 里框选泵注表 → Ctrl+C，回到这里 Ctrl+V 就能填进来；
                也可以直接上传这一段的泵注表（.xlsx / .xls）。段数与桥塞深度仍取自射孔方案。
              </p>
              <div class="pp-nodata__ops">
                <el-button
                  type="primary"
                  size="small"
                  icon="el-icon-document-copy"
                  @click="openPaste(current.stageNo)"
                >从 Excel 粘贴</el-button>
                <el-button
                  size="small"
                  icon="el-icon-upload2"
                  :loading="rowUploading === current.stageNo"
                  @click="pickRowFile(current.stageNo)"
                >上传覆盖本段</el-button>
              </div>
            </div>

            <template v-else>
            <div class="pp-rowsbar">
              <span class="pp-rowsbar__text">
                第 {{ activeStage }} 段共 <b>{{ current.rows.length }}</b> 行，当前显示第
                <b>{{ pageRange[0] }}-{{ pageRange[1] }}</b> 行
              </span>
              <div class="pp-rowsbar__right">
                <el-select v-model="pageSize" size="mini" style="width: 110px" @change="pageSizeChange">
                  <el-option v-for="s in pageSizeOptions" :key="s" :label="s + ' 行/页'" :value="s" />
                </el-select>
                <el-checkbox v-model="compact" class="pp-rowsbar__compact">紧凑行高</el-checkbox>
              </div>
            </div>

            <el-table
              :data="pageRows"
              size="small"
              border
              :row-class-name="rowClass"
              :max-height="tableHeight"
              :row-style="compact ? compactRowStyle : null"
              :cell-style="compact ? compactCellStyle : null"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in columns"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align || 'left'"
              >
                <template slot-scope="scope">
                  <!--
                    ⚠️ 这里刻意用原生 input，不用 el-input。
                    el-input 的 setNativeInputValue() 里有 `if (input.value === 目标值) return`，
                    input.value 对被删掉重排的值会做数字归一（'50' → '50'，但 '863.00' → '863'），
                    值一旦被 DOM 归一化就跟 target 比不相等，watch 又有 `nativeInputValue` 短路，
                    结果就是「数据在 rows 里、input 上却没 value」——粘贴/覆盖后整列显示空白。
                    原生 input 的 value 由渲染函数直出，没有这层状态，改多少就显示多少。
                  -->
                  <input
                    v-if="col.editable && col.type === 'number' && !current.resolvedFrom"
                    :value="scope.row[col.prop] == null ? '' : scope.row[col.prop]"
                    type="text"
                    class="pp-cell-input pp-cell-input--native"
                    @change="onCellEdit(scope.row.__idx, col.prop, $event.target.value)"
                    @blur="onCellBlur(scope.row.__idx, col.prop, $event.target.value)"
                  />
                  <span v-else>{{ display(scope.row, col.prop) }}</span>
                </template>
              </el-table-column>
            </el-table>

            <div class="pp-pager">
              <el-pagination
                background
                small
                layout="total, prev, pager, next, jumper"
                :total="current.rows.length"
                :page-size="pageSize"
                :current-page="pageNum"
                @current-change="onPageChange"
              />
            </div>

            <div class="pp-sum">
              <div class="pp-sum__item">
                <span class="pp-sum__label">总液量（不含送塞送球）</span>
                <span class="pp-sum__value">{{ current.summary.totalFluid }}</span>
                <span class="pp-sum__unit">m³</span>
              </div>
              <div class="pp-sum__item">
                <span class="pp-sum__label">加砂量</span>
                <span class="pp-sum__value">{{ current.summary.totalSand }}</span>
                <span class="pp-sum__unit">m³</span>
              </div>
              <div class="pp-sum__item">
                <span class="pp-sum__label">砂液量</span>
                <span class="pp-sum__value">{{ current.summary.totalLiquidVol }}</span>
                <span class="pp-sum__unit">m³</span>
              </div>
              <div class="pp-sum__item">
                <span class="pp-sum__label">总时间</span>
                <span class="pp-sum__value">{{ current.summary.totalMinutes }}</span>
                <span class="pp-sum__unit">min</span>
              </div>
              <div class="pp-sum__item">
                <span class="pp-sum__label">顶替液</span>
                <span class="pp-sum__value">{{ current.summary.flush }}</span>
                <span class="pp-sum__unit">m³</span>
              </div>
            </div>

            <el-alert
              v-for="(w, i) in (current.warnings || [])"
              :key="'w' + i"
              :title="w"
              type="warning"
              show-icon
              :closable="false"
              class="pp-warn"
            />

            <div class="pp-notes">
              <div class="pp-notes__title">制式备注（随文档一起输出）</div>
              <ol class="pp-notes__list">
                <li v-for="(n, i) in NOTES" :key="i">{{ n }}</li>
              </ol>
            </div>
            </template>
          </template>
        </el-card>
      </div>
    </div>

    <!--
      单段上传用的隐藏 input。
      ⚠️ 用原生 input 而不是 el-upload：el-upload 的 file-list 状态会跨段残留，
         换段后上一次选过的文件还在列表里，容易点错；原生 input 每次点击前把 value 清空即可重复选同一文件。
    -->
    <input
      ref="rowFileInput"
      type="file"
      accept=".xlsx,.xls"
      class="pp-hiddenfile"
      @change="onRowFileChange"
    />

    <!--
      从 Excel 粘贴：先预览再落地。
      ⚠️ 不直接覆盖：粘贴的是一片矩形，列序对不对、有没有把合计行带进来，
         用户必须在覆盖前看一眼。面板里可以直接改「目标段 / 表头行 / 列映射」。
    -->
    <el-dialog
      :visible.sync="pasteVisible"
      width="1040px"
      top="6vh"
      append-to-body
      custom-class="pp-pastedlg"
      :close-on-click-modal="false"
      @opened="focusPasteArea"
    >
      <div slot="title" class="pp-pastedlg__title">
        <i class="el-icon-document-copy"></i>
        从 Excel 粘贴泵注数据
        <span class="pp-pastedlg__sub" v-if="pasteRaw">
          已读入 {{ pasteInfo.rows }} 行 × {{ pasteInfo.cols }} 列（{{ pasteFrom === 'html' ? '带格式' : '纯文本' }}）
        </span>
      </div>

      <div class="pp-pastedlg__body">
        <!-- 第 1 步：粘贴区 -->
        <div class="pp-pastearea" :class="{ 'is-filled': !!pasteRaw, 'is-focus': pasteFocus }">
          <el-input
            ref="pasteArea"
            v-model="pasteRaw"
            type="textarea"
            :rows="6"
            resize="none"
            placeholder="在这里按 Ctrl+V 粘贴（先在 Excel 里框选泵注表并复制）"
            @paste.native="onPasteInArea"
            @input="pasteDirty = true"
            @focus="pasteFocus = true"
            @blur="pasteFocus = false"
          />
          <div class="pp-pastearea__hint">
            <i class="el-icon-info"></i>
            连表头一起复制最准；只复制数据区也能用，会自动按列序对应。
            <el-button type="text" size="mini" @click="clearPaste">清空重贴</el-button>
          </div>
        </div>

        <!-- 第 2 步：解析结果与选项 -->
        <div v-if="pasteResult" class="pp-pastecfg">
          <div class="pp-pastecfg__row">
            <span class="pp-pastecfg__label">写入段</span>
            <el-select v-model="pasteTarget" size="small" style="width: 120px">
              <el-option
                v-for="d in stageDefs"
                :key="d.stageNo"
                :value="d.stageNo"
                :label="'第 ' + d.stageNo + ' 段'"
              />
            </el-select>
            <span class="pp-pastecfg__label" style="margin-left: 18px">解析方式</span>
            <el-tag size="mini" :type="pasteModeTag.type" effect="plain">{{ pasteModeTag.text }}</el-tag>
            <span class="pp-pastecfg__label" style="margin-left: 18px">读到</span>
            <b class="pp-pastecfg__num">{{ pasteResult.rows.length }}</b>
            <span class="pp-pastecfg__unit">行</span>
            <el-checkbox v-model="pasteKeepFlush" style="margin-left: auto">
              保留粘贴里的顶替液原值
            </el-checkbox>
          </div>

          <!--
            列映射：猜错了可以让用户手动改。
            ⚠️ 字段有 12 个、下拉框又必须够宽才看得全「H 砂液量(m³)」，
               所以这里用**固定列宽的网格**排，而不是自由换行的 flex ——
               自由换行时每行末尾的空位会把下一项顶到上一项的下面，
               视觉上看起来就像「列对应」标签跟「排量」串到了一起。
          -->
          <div v-if="pasteMapCols.length" class="pp-pastemap">
            <span class="pp-pastemap__label">列对应</span>
            <div class="pp-pastemap__list">
              <div v-for="m in pasteMapCols" :key="m.prop" class="pp-pastemap__item">
                <span class="pp-pastemap__field">{{ m.label }}</span>
                <el-select
                  :value="pasteMap[m.prop] == null ? -1 : pasteMap[m.prop]"
                  size="mini"
                  class="pp-pastemap__sel"
                  :title="'原始表头：' + colHeaderText(pasteMap[m.prop])"
                  @change="onPasteMapChange(m.prop, $event)"
                >
                  <el-option :value="-1" label="（无）" />
                  <el-option
                    v-for="(h, i) in pasteHeaders"
                    :key="i"
                    :value="i"
                    :label="colLetter(i) + ' ' + (h || '(空)')"
                  />
                </el-select>
              </div>
            </div>
          </div>

          <!--
            预览表：必须包含用户能改映射的**全部数值列**，
            否则改完映射在预览里看不到结果，等于让用户盲改。
          -->
          <div class="pp-pastepreview">
            <table class="pp-pastepreview__table">
              <thead>
                <tr>
                  <th style="width: 34px">#</th>
                  <th style="width: 82px">阶段</th>
                  <th>净液量</th>
                  <th>砂液量</th>
                  <th>砂比</th>
                  <th>砂浓度</th>
                  <th>砂量</th>
                  <th>累积砂量</th>
                  <th>排量</th>
                  <th>阶段时间</th>
                  <th style="width: 76px">备注</th>
                  <th style="width: 92px">支撑剂</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in pasteResult.rows"
                  :key="i"
                  :class="'pp-k-' + r.kind"
                >
                  <td class="pp-c">{{ i + 1 }}</td>
                  <td>{{ r.stage || '（续行）' }}</td>
                  <td class="pp-n">{{ numText(r.fluid) }}</td>
                  <td class="pp-n">{{ numText(r.liquidVol) }}</td>
                  <td class="pp-n">{{ numText(r.ratio) }}</td>
                  <td class="pp-n">{{ numText(r.conc) }}</td>
                  <td class="pp-n">{{ numText(r.sand) }}</td>
                  <td class="pp-n">{{ numText(r.cumSand) }}</td>
                  <td class="pp-n">{{ numText(r.rate) }}</td>
                  <td class="pp-n">{{ numText(r.minutes) }}</td>
                  <td class="pp-ell">{{ r.note || '' }}</td>
                  <td class="pp-ell">{{ r.proppant || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-for="(w, i) in pasteResult.warnings" :key="'pw' + i" class="pp-pastewarn">
            <i class="el-icon-warning-outline"></i> {{ w }}
          </div>
        </div>

        <div v-else-if="pasteError" class="pp-pasteerr">
          <i class="el-icon-warning-outline"></i> {{ pasteError }}
        </div>
      </div>

      <div slot="footer" class="pp-pastedlg__footer">
        <span class="pp-pastedlg__tip">
          <i class="el-icon-info"></i>
          写入后记得点右上角「保存」
        </span>
        <el-button size="small" @click="pasteVisible = false">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!pasteResult || !pasteResult.rows.length"
          :loading="pasteApplying"
          @click="applyPaste"
        >写入第 {{ pasteTarget }} 段</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  buildStagesWithRefs,
  summarizeRows,
  buildFlushRow,
  PUMP_COLUMNS,
  SAND_CONC_COEF,
  SAND_LIQUID_RATIO
} from './pumpProgram'
/* [安全清理] pumpSheetParser(xlsx) 已删除
import { parsePumpFile } from './pumpSheetParser'
*/
import {
  parseTsv,
  parseHtmlTable,
  matrixToPumpRows,
  matrixFromClipboard,
  maxCols,
  nonEmptyRows
} from './pumpPaste'
import { getAttachments, downloadAttachmentBlob } from '@/api/workbench'
import { getCurrentPumpTable, savePumpTable, fetchPerforationStages, fetchGeologicalStageCount } from '@/api/pump-table'
import { loadPreTestVariant } from './preTestVariants'
/* [安全清理] 已移除高危依赖 xlsx
import * as XLSX from 'xlsx'
*/

/** 工作台里「正式压裂泵注程序结果表」的附件类型编码（见 wellModules.js） */
const ATT_TYPE_PUMP_MAIN = 'PUMP_MAIN'
/** 能被 xlsx 解析的扩展名；doc/docx 只能提示用户换 Excel 版 */
const XLS_RE = /\.(xlsx|xls)$/i

/* [安全清理] xlsx 解析已移除，保留空实现避免编译失败 */
function parsePumpFile() {
	return Promise.reject(new Error('xlsx 依赖已按安全要求移除'))
}
/** 制式备注，全表一致，取自真实泵注表 */
const NOTES = [
  '压裂施工时应尽量避免施工压力突变，如遇到施工突变时应及时采取降低施工排量的措施，尽量避免压穿顶底板；',
  '压裂施工前需通知邻井施工作业单位监测压力变化；',
  '泵送桥塞时可视情况加入滑溜水；',
  '泵送桥塞、送球、清扫井筒以实际排量液量为准；',
  '施工过程中若出现施工压力高，加砂困难等情况时，请示甲方同意后，可适当加入降阻剂或自悬浮支撑剂。'
]

const DEFAULT_FORM = {
  maxRate: 12,
  padFluid: 780,
  carryFluid: 1726,
  maxRatio: 12,
  proppant: '20/40目石英砂'
}

/** 需要截到 2 位的数值列（砂液量/时间这类除法结果原表带浮点长尾） */
const NUM_FMT_PROPS = ['fluid', 'conc', 'ratio', 'sand', 'floatSand', 'cumSand', 'liquidVol', 'rate', 'minutes']

export default {
  name: 'PumpProgramPage',

  data() {
    return {
      NOTES,
      columns: PUMP_COLUMNS,
      wbWellId: '',
      wellName: '',
      form: Object.assign({}, DEFAULT_FORM),

      /* ---- 段骨架：一切渲染都由它驱动 ---- */
      /**
       * 段配置数组：[{ stageNo, refStageNo, plugDepth, startDepth, endDepth }]
       *   refStageNo 非空 → 本段泵注程序同第 refStageNo 段
       * 这是「结构性」状态，段数一改就整体重建，与行数据分开存。
       */
      stageDefs: [],
      /** 段数输入框（与 stageDefs.length 双向同步） */
      stageCountInput: 1,

      /* ---- 行数据 ---- */
      /**
       * 各段「自带」的明细行：{ [stageNo]: rows[] }
       * 引用段在这里没有条目（明细由源段提供）。
       * 用户手动改过的格也落在这里（改完即写回本段行，再整段重算合计）。
       */
      ownRows: {},

      /* ---- 段数来源：地质设计压裂点参数表（优先）---- */
      /** 各段段名，如 ['第1段', ...]；空数组表示没取到 */
      geoStages: [],
      /** 地质设计段数是否取到 —— 取到了段数就由它定，射孔方案只提供桥塞深度 */
      geoStageLoaded: false,
      geoStageLoading: false,
      /** 取不到时的原因（或取到时的一句说明），界面上如实展示 */
      geoStageMessage: '',
      /** 来源文档名，如「安13-7井组压裂地质设计（4口井）_2026.9.29.docx」 */
      geoSourceDoc: '',

      /* ---- 射孔取数（段数回落来源 + 桥塞深度唯一来源）---- */
      perfStages: [],
      perfLoaded: false,
      perfLoading: false,

      /* ---- 已保存版本 ---- */
      savedVersion: null,
      savedTableId: '',
      saving: false,

      /* ---- 上传表还原 ---- */
      upload: null,
      uploadLoading: false,

      /* ---- 工作台泵注表自动带入 ---- */
      autoDoc: null,
      autoLoading: false,
      autoError: '',
      autoWordHint: '',

      /* ---- 视图状态 ---- */
      activeStage: 1,
      pageNum: 1,
      pageSize: 12,
      pageSizeOptions: [8, 12, 16, 20, 30, 50],
      compact: false,
      /** 批量复制下拉的当前选择 */
      batchRefFrom: 0,

      /* ---- 单段上传 ---- */
      /** 正在上传覆盖的段号（0 = 空闲），驱动该行按钮转圈 */
      rowUploading: 0,
      /** 待覆盖的段号（文件选择框是全局单例，点击时记下目标段） */
      rowUploadTarget: 0,

      /* ---- 从 Excel 粘贴 ---- */
      /** 粘贴面板是否打开 */
      pasteVisible: false,
      /** 面板里那块 textarea 的原始文本（用户可手改，改完重新解析） */
      pasteRaw: '',
      /** 最近一次真正从剪贴板读到的二维数组（有它就走 HTML 路径，列名更准） */
      pasteMatrix: null,
      /**
       * 用户是否手改过 textarea。
       * true → 一律按文本重新切（手改优先）；false → 文本还是矩阵回写的那份，用矩阵解析。
       * ⚠️ 不能靠「文本 == matrixToTsv(矩阵)」来反推：剪贴板矩阵每条边都可能被
       *    textarea 归一化（行尾空白、全角空格），一比较就 false，矩阵白读了。
       */
      pasteDirty: false,
      /** 数据来自 'html' 还是 'text'，仅用于面板上的说明 */
      pasteFrom: '',
      /** 解析结果 { rows, mode, warnings } */
      pasteResult: null,
      /** 解析失败时的提示 */
      pasteError: '',
      /** 写入目标段 */
      pasteTarget: 1,
      /** 列映射 prop → 列下标（-1 表示不映射） */
      pasteMap: {},
      /** 是否保留粘贴里的顶替液原始值 */
      pasteKeepFlush: true,
      /** textarea 是否聚焦（决定 Ctrl+V 走全局还是走输入框自己） */
      pasteFocus: false,
      /** 正在写入 */
      pasteApplying: false
    }
  },

  computed: {
    /** 段数（以段配置为准，输入框可能还没提交） */
    stageCount() {
      return this.stageDefs.length || 1
    },

    /** 引用其他段的段数（页面顶部统计用） */
    refStageCount() {
      return this.stageDefs.filter(d => d.refStageNo).length
    },

    /** 当前段数的来源，用于提示文案里点名（「地质设计压裂点参数表」/「分段射孔方案」/「手填」） */
    stageSourceName() {
      if (this.geoStageLoaded) return '地质设计压裂点参数表'
      if (this.perfLoaded) return '分段射孔方案'
      return '手填'
    },

    /**
     * 顶部「段数来源」明细行 —— 只在需要解释的时候出现，正常情况返回空串不占位。
     *
     * 三种要解释的情况：
     *   1. 取不到地质设计段数 → 说明回落到了射孔方案 + 原因；
     *   2. 地质设计与射孔方案段数不一致 → 两边都报出来，并说明多出来的段没有桥塞深度；
     *   3. 取到了且段数一致 → 不提（用户不需要看）。
     */
    stageSourceHint() {
      if (!this.wbWellId) return ''
      if (!this.geoStageLoaded) {
        if (this.perfLoaded) {
          return `地质设计段数未取到（${this.geoStageMessage || '原因未知'}），暂用射孔方案的 ${this.perfStages.length} 段。`
        }
        return this.geoStageMessage ? `地质设计段数未取到：${this.geoStageMessage}` : ''
      }
      const g = this.geoStages.length
      if (this.perfLoaded && this.perfStages.length !== g) {
        return `地质设计压裂点参数表 ${g} 段，分段射孔方案 ${this.perfStages.length} 段；`
          + `段数以地质设计为准，桥塞位置取射孔方案（未覆盖的段需手工填）。`
      }
      if (this.perfLoaded && this.perfStages.length === g
          && this.perfStages.some(s => !s.plugDepth)) {
        return `地质设计与射孔方案均为 ${g} 段；其中部分段射孔方案没有封隔器位置，桥塞深度需手工填。`
      }
      return ''
    },

    /**
     * 最终可渲染的段列表。
     * 引用关系在这里解析：引用段拿源段的行、顶替液按自己的桥塞深度重算。
     */
    allStages() {
      const st = buildStagesWithRefs(this.stageDefs, this.form, this.ownRows)
      return st.length ? st : [this.emptyStage()]
    },

    current() {
      return this.allStages.find(s => s.stageNo === this.activeStage) || this.allStages[0] || null
    },

    /**
     * 当前页的行切片。
     * ⚠️ 每行带 `__idx`（= 它在整张表里的行号），单元格编辑必须用它写回，
     *    不能用 `scope.$index`（那是当前页内的下标，翻页后会写到错误的行上）。
     */
    pageRows() {
      if (!this.current) return []
      const start = (this.pageNum - 1) * this.pageSize
      return this.current.rows.slice(start, start + this.pageSize).map((r, i) => {
        const copy = Object.assign({}, r)
        copy.__idx = start + i
        return copy
      })
    },

    /** 当前页显示的行号区间，如 [13, 24] */
    pageRange() {
      const total = this.current ? this.current.rows.length : 0
      const start = (this.pageNum - 1) * this.pageSize + 1
      const end = Math.min(start + this.pageSize - 1, total)
      return [total === 0 ? 0 : start, end]
    },

    /** 行多时自动加高，最多到视口可用高度 */
    tableHeight() {
      return Math.max(300, Math.min(560, window.innerHeight - 300))
    },

    /* ---- 粘贴面板 ---- */

    /** 粘贴内容规模，显示在面板标题上 */
    pasteInfo() {
      const m = this.pasteMatrix
      if (!m) return { rows: 0, cols: 0 }
      return { rows: nonEmptyRows(m), cols: maxCols(m) }
    },

    /** 解析方式的中文标签 */
    pasteModeTag() {
      const mode = this.pasteResult ? this.pasteResult.mode : ''
      if (mode === 'header') return { type: 'success', text: '按表头识别' }
      if (mode === 'guess') return { type: 'warning', text: '无表头，按列序推断' }
      if (mode === 'single') return { type: 'warning', text: '单列（按净液量）' }
      return { type: 'info', text: '未识别' }
    },

    /** 可映射的字段（顺序即面板里的排列） */
    pasteMapCols() {
      if (!this.pasteResult || !this.pasteResult.rows.length) return []
      return PASTE_MAP_FIELDS
    },

    /** 表头行文本（用户选列时用来显示「A 序号 / B 阶段 …」） */
    pasteHeaders() {
      // matrix 为空（纯文本粘贴）时退回 pasteRaw，否则下拉框选项全是空
      const m = this.pasteMatrix && this.pasteMatrix.length
        ? this.pasteMatrix
        : parseTsv(this.pasteRaw || '')
      if (!m || !m.length) return []
      // 取「非数据行」里第一行作为表头显示；识别不出就用第一行
      const idx = this.pasteHeaderIdx
      const row = (idx >= 0 && m[idx]) ? m[idx] : m[0]
      return (row || []).map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim())
    },

    /** 表头行下标（供 pasteHeaders 显示） */
    pasteHeaderIdx() {
      const m = this.pasteMatrix
      // ⚠️ 没有矩阵（纯文本粘贴）时不能返回 -1：调用方用 `start = headerIdx + 1`
      //    算数据起点，-1 会让 start=0 把**表头行当成数据行**读进来。
      //    这种场景退化成「按 pasteRaw 切出来的第一行当表头」。
      if (!m) {
        const t = parseTsv(this.pasteRaw || '')
        if (!t.length) return -1
        const limit0 = Math.min(t.length, 8)
        for (let i = 0; i < limit0; i++) {
          const joined = (t[i] || []).join('')
          if (/序号/.test(joined) && /阶段/.test(joined)) return i
        }
        return 0
      }
      const limit = Math.min(m.length, 8)
      for (let i = 0; i < limit; i++) {
        const joined = (m[i] || []).join('')
        if (/序号/.test(joined) && /阶段/.test(joined)) return i
      }
      return 0
    }
  },

  watch: {
    activeStage() {
      // 换段必须回第 1 页，否则会停在上一段的页码上显示空白
      this.pageNum = 1
    },
    pageSize() {
      this.pageNum = 1
    },

    /**
     * 用户在面板里手动改了粘贴文本 → 重新解析。
     * ⚠️ 不能用 pasteMatrix 覆盖：用户可能删掉了某几行或改了某个数，
     *    一律以 textarea 里的文本为准（这也是「粘贴后还能改」的意义）。
     */
    pasteRaw(v) {
      const text = String(v == null ? '' : v)
      if (!text.trim()) {
        this.pasteResult = null
        this.pasteError = ''
        this.pasteDirty = false
        return
      }
      /*
       * 文本没被改过（== 矩阵回写的 TSV）就直接用矩阵解析 —— 矩阵来自 text/html，
       * 带 rowspan/colspan，还原副表头比重新切纯文本准。
       * 用户动过文本（pasteDirty）就一律以文本为准，这正是「粘完还能改」的意义。
       */
      const fromMatrix = !this.pasteDirty &&
        this.pasteMatrix && this.matrixToTsv(this.pasteMatrix) === text
      this.parsePasteText(text, fromMatrix ? this.pasteMatrix : null)
    }
  },

  created() {
    this.initFromRoute()
  },

  mounted() {
    // 全局 Ctrl+V：不在输入框里按也能接住（页面里最顺手的方式）
    document.addEventListener('paste', this.onGlobalPaste)
  },

  beforeDestroy() {
    document.removeEventListener('paste', this.onGlobalPaste)
  },

  beforeRouteUpdate(to, from, next) {
    // ⚠️ 路由 path 没变、只换 query（工作台里从 A 井切到 B 井）时，
    //    vue-router 会复用同一个组件实例，created 不会重新执行 →
    //    页面还显示上一口井的表格和段数。
    if (String(to.query.wbWellId || '') !== String(from.query.wbWellId || '')) {
      this.resetForWell()
      next()
      this.$nextTick(() => this.initFromRoute())
    } else {
      next()
    }
  },

  methods: {
    /* ============================================================
     *  初始化
     * ============================================================ */

    emptyStage() {
      return {
        stageNo: 1, refStageNo: null, plugDepth: 0, startDepth: null, endDepth: null,
        resolvedFrom: null, rows: [], summary: summarizeRows([]), warnings: []
      }
    },

    async initFromRoute() {
      const q = this.$route.query || {}
      this.wbWellId = q.wbWellId || ''
      this.wellName = q.wellName || ''
      this.resetStageSource()

      // 1) 先取「地质设计压裂点参数表」的段数 —— 这是「有几段就有几段泵注程序」的**默认来源**
      //    业务口径：地层有几个改造段是地质设计定的，不该被「有没有做过射孔方案」左右
      await this.loadGeologicalStages()

      // 2) 再取射孔段骨架（各段桥塞深度 + 起止深度）—— 段数只作为地质设计取不到时的回落
      await this.loadFromPerforation()

      // 2.5) 井名兜底：从工作台跳过来时 query 里不一定带 wellName，
      //      页面标题会显示「井号：-」，但段数其实已经是这口井的了，容易让人以为认错井。
      //      loadGeologicalStages 正常时已回填；这里补「地质设计取不到」那条路径。
      if (!this.wellName) this.loadWellNameQuietly()

      // 3) 最后尝试恢复本井已保存的泵注程序（有就沿用用户确认过的内容）
      const restored = await this.loadSaved()
      if (!restored) this.autoLoadPumpDoc()
    },

    /** 只补井名，失败静默（不弹提示、不阻塞首屏） */
    async loadWellNameQuietly() {
      if (!this.wbWellId) return
      try {
        const res = await getCurrentPumpTable(this.wbWellId)
        const rec = res && res.data
        // 泵注版本里存的 wellName 可能是「安13-7-3平3本地」这种上传时手写的，
        // 只在它看起来是正经井名（不含「本地/测试」这类字样）时才用
        const n = rec && rec.wellName ? String(rec.wellName).trim() : ''
        if (n && !/本地|测试|test|demo/i.test(n)) this.wellName = n
      } catch (e) {
        // 忽略
      }
    },

    resetStageSource() {
      this.geoStages = []
      this.geoStageLoaded = false
      this.geoStageLoading = false
      this.geoStageMessage = ''
      this.geoSourceDoc = ''
    },

    /**
     * 取「地质设计压裂点参数表」的段数（按「分段」列去重）。
     *
     * 取到了就把 geoStages 填上，段数**以它为准**；
     * 取不到（没传地质设计 / 表里没这口井 / 没有分段列）保持空，由射孔方案回落，
     * 原因写进 geoStageMessage，界面上如实显示 —— 不能让用户以为是「本井只有 1 段」。
     */
    async loadGeologicalStages() {
      if (!this.wbWellId) return
      this.geoStageLoading = true
      try {
        const res = await fetchGeologicalStageCount(this.wbWellId)
        const r = (res && res.data) || {}
        // 路由没带井名时用后端查到的补上（否则标题显示「井号：-」，
        // 而段数、桥塞其实都是这口井的，看起来像页面没认出井）
        if (!this.wellName && r.wellName) this.wellName = r.wellName
        const n = Number(r.stageCount || 0)
        if (n > 0) {
          this.geoStages = (r.stages || []).slice()
          this.geoStageLoaded = true
          this.geoSourceDoc = r.sourceDoc || ''
          this.geoStageMessage = r.message || ''
        } else {
          this.geoStages = []
          this.geoStageLoaded = false
          this.geoSourceDoc = r.sourceDoc || ''
          this.geoStageMessage = r.message || '地质设计里没取到压裂点参数表'
        }
      } catch (e) {
        // 接口不通不该挡住页面：段数回落射孔方案，原因写明
        this.geoStages = []
        this.geoStageLoaded = false
        this.geoStageMessage = '段数接口不可用：' + (e && e.message ? e.message : '请求失败')
      } finally {
        this.geoStageLoading = false
      }
    },

    resetForWell() {
      this.form = Object.assign({}, DEFAULT_FORM)
      this.stageDefs = []
      this.stageCountInput = 1
      this.ownRows = {}
      this.resetStageSource()
      this.perfStages = []
      this.perfLoaded = false
      this.savedVersion = null
      this.savedTableId = ''
      this.upload = null
      this.autoDoc = null
      this.autoError = ''
      this.autoWordHint = ''
      this.autoLoading = false
      this.activeStage = 1
      this.pageNum = 1
    },

    /**
     * 从「分段射孔方案」结构化表取各段的桥塞深度与起止深度。
     *
     * <p><b>段数由谁定</b>（2026-11-15 改）：
     * 段数<b>以地质设计压裂点参数表为准</b>（{@link #loadGeologicalStages} 已先跑），
     * 射孔方案在这里只负责提供「每段的桥塞位置 / 起止深度」。
     * 只有地质设计取不到段数时，才回落到射孔方案的段数。
     *
     * <p>为什么必须分开：地质设计定的是「地层有几个改造段」（本井 9 段），
     * 射孔方案是下游产物，可能还没做、只做了一部分、或做的是旧版（实测这口井
     * 射孔方案存过 2 段的旧版本）。拿射孔方案的段数当唯一来源，
     * 就会出现「地质设计 9 段，泵注程序只长 2 张表」。
     *
     * <p>⚠️ 桥塞深度仍只能来自射孔方案 —— 压裂点参数表里没有封隔器位置这一列。
     * 所以段数多于射孔段时，多出来的段 plugDepth 为 0（顶替液按 2 m³ 兜底，
     * 页面下方有 warning 提示），这与「段数不对」是两件事，不能混为一谈。
     */
    async loadFromPerforation() {
      if (!this.wbWellId) {
        this.applyStageDefs([{ stageNo: 1, plugDepth: 0 }])
        return
      }
      this.perfLoading = true
      try {
        const stages = await fetchPerforationStages(this.wbWellId)
        this.perfStages = stages
        this.perfLoaded = stages.length > 0

        // 段数：地质设计优先，射孔方案只做回落
        const target = this.geoStageLoaded
          ? this.geoStages.length
          : stages.length

        if (target > 0) {
          this.applyStageDefs(this.buildStageSkeleton(target, stages))
        } else {
          this.applyStageDefs([{ stageNo: 1, plugDepth: 0 }])
        }
      } catch (e) {
        this.perfLoaded = false
        if (this.geoStageLoaded) {
          this.applyStageDefs(this.buildStageSkeleton(this.geoStages.length, []))
        } else {
          this.applyStageDefs([{ stageNo: 1, plugDepth: 0 }])
        }
      } finally {
        this.perfLoading = false
      }
    },

    /**
     * 拼段骨架：段数取 target，深度信息从射孔段里按段号对齐。
     *
     * 段号映射不按「第几个」硬对，而按 stageNo 数值对齐：
     * 射孔方案里若缺了中间某段（例如只有 1、3、5），硬按顺序对会让 3 号的深度
     * 落到 2 号段上，顶替液与桥塞位置一起错位。
     */
    buildStageSkeleton(target, perfStages) {
      const byNo = {}
      ;(perfStages || []).forEach(s => {
        const no = Number(s.stageNo)
        if (isFinite(no)) byNo[no] = s
      })
      const out = []
      for (let i = 1; i <= target; i++) {
        const p = byNo[i]
        out.push({
          stageNo: i,
          plugDepth: p && p.plugDepth ? p.plugDepth : 0,
          startDepth: p ? p.startDepth : null,
          endDepth: p ? p.endDepth : null
        })
      }
      return out
    },

    /**
     * 手动重取段骨架（地质设计段数 + 射孔桥塞深度）。
     *
     * 按钮语义从「重新读取射孔段」扩成「重取段数与桥塞深度」：
     * 用户改完地质设计（换了一版文档、加了几段）想立刻生效时点这里，
     * 只重取射孔方案是不够的 —— 段数根本不在射孔方案里。
     */
    async reloadStageSource() {
      const keepRefs = {}
      this.stageDefs.forEach(d => { if (d.refStageNo) keepRefs[d.stageNo] = d.refStageNo })
      await this.loadGeologicalStages()
      await this.loadFromPerforation()
      // 段数没变的话，把手动设过的引用关系还原回去（重取不该把用户的引用抹掉）
      this.stageDefs.forEach(d => {
        if (keepRefs[d.stageNo] && !d.refStageNo) d.refStageNo = keepRefs[d.stageNo]
      })
      this.stageDefs = this.stageDefs.slice()
      if (this.geoStageLoaded) {
        this.$message.success(`已重新读取地质设计，共 ${this.geoStages.length} 段`)
      } else if (this.perfLoaded) {
        this.$message.warning(`地质设计段数未取到（${this.geoStageMessage}），暂用射孔方案 ${this.perfStages.length} 段`)
      } else {
        this.$message.warning('地质设计与射孔方案都没取到段数，请手工填')
      }
    },

    /**
     * 用一批「段骨架」重建 stageDefs。
     *
     * 保留原则：同段号的桥塞深度如果用户手改过，以用户值为准；
     *           引用关系只在段仍然存在时保留。
     */
    applyStageDefs(list) {
      const old = {}
      this.stageDefs.forEach(d => { old[d.stageNo] = d })
      const rows = {}
      this.stageDefs.forEach(d => { rows[d.stageNo] = d.refStageNo })

      const next = list.map(s => {
        const o = old[s.stageNo]
        return {
          stageNo: s.stageNo,
          // 用户手改过的深度优先（射孔重取时不覆盖用户的编辑）
          plugDepth: (o && o.plugDepthTouched) ? o.plugDepth : (s.plugDepth || 0),
          plugDepthTouched: o ? !!o.plugDepthTouched : false,
          startDepth: s.startDepth == null ? (o ? o.startDepth : null) : s.startDepth,
          endDepth: s.endDepth == null ? (o ? o.endDepth : null) : s.endDepth,
          refStageNo: null
        }
      })
      const byNo = {}
      next.forEach(d => { byNo[d.stageNo] = d })
      // 引用关系还原：只在源段仍存在、且不是自引用时保留
      Object.keys(rows).forEach(k => {
        const no = Number(k)
        const ref = rows[k]
        if (!ref || !byNo[no] || !byNo[ref] || ref === no) return
        byNo[no].refStageNo = ref
      })

      this.stageDefs = next
      this.stageCountInput = next.length || 1
      if (!this.allStages.some(s => s.stageNo === this.activeStage)) this.activeStage = 1
      this.pageNum = 1
    },

    /**
     * 段数变化 → 自动长出/收缩对应数量的段。
     *
     * 新增段默认桥塞深度：从上一个已有段往井口方向按段间距外推是不靠谱的，
     * 所以留空（0）让用户填，并在页面提示。但会尽量保留已有段的深度与引用。
     */
    onStageCountChange(v) {
      const n = Math.max(1, Math.min(30, Math.round(Number(v) || 1)))
      const cur = this.stageDefs.slice().sort((a, b) => a.stageNo - b.stageNo)
      const next = []
      for (let i = 1; i <= n; i++) {
        const exist = cur.find(d => d.stageNo === i)
        if (exist) {
          next.push(exist)
        } else {
          next.push({
            stageNo: i,
            plugDepth: 0,
            plugDepthTouched: false,
            startDepth: null,
            endDepth: null,
            refStageNo: null
          })
        }
      }
      // 段号被削掉时，指向已删除段的引用要清空，否则会变成悬空引用
      const alive = {}
      next.forEach(d => { alive[d.stageNo] = true })
      next.forEach(d => {
        if (d.refStageNo && !alive[d.refStageNo]) d.refStageNo = null
      })
      this.stageDefs = next
      this.stageCountInput = n
      if (this.activeStage > n) this.activeStage = 1
      this.pageNum = 1
      // 段被砍掉 → 清掉对应行数据，避免下次加回段数时冒出旧数据
      const keep = {}
      next.forEach(d => {
        if (this.ownRows[d.stageNo]) keep[d.stageNo] = this.ownRows[d.stageNo]
      })
      this.ownRows = keep
    },

    /** 手改某段桥塞深度 */
    onPlugDepthEdit(stageNo, val) {
      const d = this.stageDefs.find(x => x.stageNo === Number(stageNo))
      if (!d) return
      const n = Number(val)
      if (val !== '' && (!isFinite(n) || n < 0)) {
        this.$message.warning('桥塞深度需为不小于 0 的数值')
        return
      }
      d.plugDepth = isFinite(n) ? n : 0
      d.plugDepthTouched = true
      // 引用段：深度变了顶替液要重算；自带段：也要重算顶替液那一行
      if (!d.refStageNo) this.refreshFlushRow(d.stageNo)
      this.stageDefs = this.stageDefs.slice()
    },

    /** 改某段的复制来源 */
    onRefChange(stageNo, refNo) {
      const d = this.stageDefs.find(x => x.stageNo === Number(stageNo))
      if (!d) return
      const ref = Number(refNo) || 0
      if (ref && ref === d.stageNo) {
        this.$message.warning('不能引用自己')
        return
      }
      d.refStageNo = ref || null
      if (d.refStageNo) {
        // 变成引用段 → 自己的明细行作废（写库时后端也会强制清空，这里先清避免前端显示两份）
        delete this.ownRows[d.stageNo]
      }
      this.stageDefs = this.stageDefs.slice()
      this.ownRows = Object.assign({}, this.ownRows)
    },

    /** 解除引用，改回本段自带（按当前参数重新生成一份） */
    breakRef(stageNo) {
      this.onRefChange(stageNo, 0)
      this.$message.success(`第 ${stageNo} 段已改为自带泵注程序`)
    },

    /** 批量设置复制来源（0 = 全部改回自带） */
    applyBatchRef() {
      const ref = Number(this.batchRefFrom) || 0
      if (ref) {
        this.$confirm(
          `把所有「不是第 ${ref} 段」的段都改为复制第 ${ref} 段？各段桥塞深度与顶替液保持各自的值。`,
          '批量复制',
          { type: 'warning' }
        ).then(() => {
          this.stageDefs.forEach(d => {
            if (d.stageNo === ref) return
            d.refStageNo = ref
            delete this.ownRows[d.stageNo]
          })
          this.stageDefs = this.stageDefs.slice()
          this.ownRows = Object.assign({}, this.ownRows)
          this.$message.success(`已把其余段设为复制第 ${ref} 段`)
        }).catch(() => {})
      } else {
        this.stageDefs.forEach(d => { d.refStageNo = null })
        this.stageDefs = this.stageDefs.slice()
        this.$message.success('已全部改回自带泵注程序')
      }
    },

    /**
     * 可作为复制来源的段。
     *
     * 排除自己；也排除「本身也是引用段」的段 —— 让第 7 段去复制第 3 段、
     * 而第 3 段又复制第 2 段，用户很难在界面上理解最终到底复制了谁。
     * 一律只允许复制「自带数据」的段，语义清晰。
     */
    refCandidates(selfNo) {
      return this.stageDefs
        .filter(d => d.stageNo !== Number(selfNo) && !d.refStageNo)
        .sort((a, b) => a.stageNo - b.stageNo)
    },

    /** 哪些段引用了当前段（用于「改这里会影响别人」的提示） */
    referencedBy(stageNo) {
      return this.stageDefs
        .filter(d => Number(d.refStageNo) === Number(stageNo))
        .map(d => d.stageNo)
    },

    /* ============================================================
     *  工作台泵注表自动带入
     * ============================================================ */

    async autoLoadPumpDoc() {
      const wbWellId = this.wbWellId
      if (!wbWellId) return
      // 已经有段骨架（来自射孔）时不再用附件覆盖 —— 段数以射孔为准
      this.autoLoading = true
      this.autoError = ''
      this.autoWordHint = ''
      try {
        const res = await getAttachments(wbWellId)
        const list = (res && res.data) || []
        const target = list
          .filter(a => String(a.attachmentType || '').toUpperCase() === ATT_TYPE_PUMP_MAIN)
          .sort((a, b) => {
            const ta = new Date(String(a.uploadTime || '').replace(/-/g, '/')).getTime() || 0
            const tb = new Date(String(b.uploadTime || '').replace(/-/g, '/')).getTime() || 0
            if (ta !== tb) return tb - ta
            return String(b.attachmentId || '').localeCompare(String(a.attachmentId || ''))
          })[0]

        if (!target) return
        this.autoDoc = target

        const fileName = target.fileName || ''
        if (!XLS_RE.test(fileName)) {
          this.autoWordHint =
            `工作台上传的泵注表是「${fileName}」，页内只支持 Excel 解析，请上传 .xlsx / .xls 版本`
          return
        }

        const blob = await downloadAttachmentBlob(target.attachmentId)
        if (!blob || !blob.size) {
          this.autoError = '工作台的泵注表下载为空，请在工作台重新上传'
          return
        }
        const file = new File([blob], fileName, {
          type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const ok = await this.onFileChange({ raw: file }, { silent: true })
        if (ok) {
          this.$message.success(`已自动带入工作台泵注表「${fileName}」`)
        }
      } catch (e) {
        this.autoError = '读取工作台泵注表失败：' + (e.message || e)
      } finally {
        this.autoLoading = false
      }
    },

    async reloadAutoDoc() {
      if (!this.autoDoc) return
      this.uploadLoading = true
      try {
        await this.autoLoadPumpDoc()
      } finally {
        this.uploadLoading = false
      }
    },

    /**
     * 解析工作台带进来的泵注表，把每段的行灌进 ownRows。
     *
     * ⚠️ 与旧实现的差异：不再用上传表决定「有多少段」——
     *    段数一律以射孔方案为准，上传表只负责把「行内容」填进对应段。
     *    段号对不上的行会被丢弃并提示，避免段数错位。
     */
    async onFileChange(fileObj, opts) {
      const o = opts || {}
      const file = fileObj && fileObj.raw ? fileObj.raw : fileObj
      if (!file) return false
      try {
        const parsed = await parsePumpFile(file, { wellName: this.wellName })
        this.upload = parsed
        const pumpRows = {}
        ;(parsed.pumpSheets || []).forEach(sh => {
          // ⚠️ 段号在 sheet 上（sh.stageNo），不在行上 ——
          //    真实档位泵注表的表体里没有「段」这一列，行级 stageNo 恒为 undefined。
          //    旧代码取 r.stageNo 导致所有行被丢弃，整表导入一直静默无效。
          const no = Number(sh.stageNo)
          if (!isFinite(no) || no <= 0) return
          if (!pumpRows[no]) pumpRows[no] = []
          ;(sh.rows || []).forEach(r => pumpRows[no].push(Object.assign({}, r)))
        })

        const moved = {}
        Object.keys(pumpRows).forEach(k => {
          const no = Number(k)
          if (this.stageDefs.some(d => d.stageNo === no)) {
            moved[no] = pumpRows[k]
          }
        })
        const filled = Object.keys(moved).length
        if (!filled) {
          if (!o.silent) this.$message.warning('泵注表里没找到能对上段号的行，请检查表头「段」列')
          return false
        }
        // 灌进来的段一律视为「自带数据」（上传表已经是成品，不做引用推导）
        Object.keys(moved).forEach(k => {
          const d = this.stageDefs.find(x => x.stageNo === Number(k))
          if (d) {
            d.refStageNo = null
            // 上传表里的顶替液行可能和本段桥塞深度不符，但它是用户的实际施工表，保持原样
          }
        })
        this.ownRows = Object.assign({}, this.ownRows, moved)
        this.stageDefs = this.stageDefs.slice()
        if (!o.silent) {
          this.$message.success(`已解析泵注表，填入 ${filled} 段`)
        }
        return true
      } catch (e) {
        this.autoError = '解析泵注表失败：' + (e.message || e)
        return false
      }
    },

    /* ============================================================
     *  单段上传 / 导出
     * ============================================================ */

    /** 点击某段的「上传」→ 记下目标段并唤起文件选择框 */
    pickRowFile(stageNo) {
      const no = Number(stageNo)
      if (!no) return
      this.rowUploadTarget = no
      const el = this.$refs.rowFileInput
      if (!el) return
      // 清空 value：否则连续两次选同一个文件不会触发 change
      el.value = ''
      el.click()
    },

    /**
     * 解析用户选的文件，只把「第 N 段」的行灌进目标段。
     *
     * 与整表导入（onFileChange）的区别：
     *   · 段号只认目标段，其余段的行一律忽略
     *   · 文件里没有段号列时（单张档位泵注表，本来就是一段一张），整体当作目标段
     *   · 覆盖后该段自动解除「复制来源」——它现在有自己的数据了
     */
    async onRowFileChange(e) {
      const file = e && e.target && e.target.files && e.target.files[0]
      const stageNo = Number(this.rowUploadTarget) || 0
      if (!file || !stageNo) return
      this.rowUploading = stageNo
      try {
        const parsed = await parsePumpFile(file, { wellName: this.wellName })
        const rows = this.pickRowsForStage(parsed, stageNo)
        if (!rows.length) {
          this.$message.warning(
            `「${file.name}」里没解析出泵注表数据，` +
            '请确认文件里有「净液量 / 砂浓度 / 砂比」这几列'
          )
          return
        }

        const stage = this.allStages.find(s => s.stageNo === stageNo)
        const oldCount = stage ? stage.rows.length : 0
        const isRef = !!(this.stageDefs.find(d => d.stageNo === stageNo) || {}).refStageNo

        await this.$confirm(
          `用「${file.name}」的 ${rows.length} 行覆盖第 ${stageNo} 段` +
          (oldCount ? `（原 ${oldCount} 行）` : '') +
          (isRef ? '？\n该段当前是「复制其他段」，覆盖后会改为本段自带。' : '？'),
          '覆盖本段数据',
          { type: 'warning', confirmButtonText: '覆盖', cancelButtonText: '取消' }
        )

        const d = this.stageDefs.find(x => x.stageNo === stageNo)
        if (d) d.refStageNo = null
        // 上传表的顶替液是实际施工值，原样保留（不按桥塞深度重算）
        this.ownRows = Object.assign({}, this.ownRows, { [stageNo]: rows })
        this.stageDefs = this.stageDefs.slice()
        this.activeStage = stageNo
        this.pageNum = 1
        this.$message.success(`已用「${file.name}」覆盖第 ${stageNo} 段，共 ${rows.length} 行（记得点右上角保存）`)
      } catch (err) {
        if (err !== 'cancel' && err !== 'close') {
          this.$message.error('解析文件失败：' + ((err && err.message) || err))
        }
      } finally {
        this.rowUploading = 0
        this.rowUploadTarget = 0
        if (e && e.target) e.target.value = ''
      }
    },

    /**
     * 从解析结果里取出属于目标段的行。
     *
     * 段号是挂在 sheet 上的（解析器按「方案表段号顺序 ↔ 泵注表 sheet 顺序」对齐），
     * 不是挂在行上 —— 真实档位泵注表表体里根本没有「段」这一列。
     *
     * 优先级：
     *   ① 有 sheet 的 stageNo 命中目标段 → 用它
     *   ② 只有一张泵注表（sharedAllStages）→ 整张当目标段（同参数多段施工的常见形态）
     *   ③ 什么都没命中但文件里只有一张泵注表 → 仍当目标段，宁可让用户传进来再改
     */
    pickRowsForStage(parsed, stageNo) {
      const sheets = ((parsed && parsed.pumpSheets) || []).filter(sh => (sh.rows || []).length)
      if (!sheets.length) return []

      // ① 精确命中
      const hit = sheets.filter(sh => Number(sh.stageNo) === Number(stageNo))
      const picked = hit.length ? hit : []

      // ② 单档位共用
      if (!picked.length) {
        const shared = sheets.filter(sh => sh.sharedAllStages)
        if (shared.length) picked.push(...shared)
      }

      // ③ 兜底：整份文件只有一张泵注表
      if (!picked.length && sheets.length === 1) picked.push(sheets[0])

      const out = []
      picked.forEach(sh => (sh.rows || []).forEach(r => out.push(Object.assign({}, r))))
      return out.map((r, i) => Object.assign({}, r, { no: i + 1 }))
    },

    /**
     * 导出某一段为 Excel。
     *
     * 走前端 XLSX 而不是后端接口：泵注表按段导出是纯展示动作，
     * 没必要为此新增一个后端接口和一次往返；而且导出的就是用户当前屏幕上看到的值
     * （含手工编辑、上传覆盖后的内容），不必先保存。
     *
     * ⚠️ 导出的是渲染后的行（含派生列），不是 ownRows 原样 ——
     *    ownRows 里可能缺派生列，直接导出会出现整列空白。
     */
    exportStage(stageNo) {
      const no = Number(stageNo)
      const st = this.allStages.find(s => s.stageNo === no)
      if (!st || !st.rows || !st.rows.length) {
        this.$message.warning(`第 ${no} 段暂无可导出的数据`)
        return
      }

      const head = [
        ['泵注程序表', '', '', '', '', '', '', '', '', '', '', ''],
        [
          `井号：${this.wellName || '-'}`,
          `第 ${no} 段`,
          `桥塞位置：${st.plugDepth || '-'} m`,
          st.resolvedFrom ? `（同第 ${st.resolvedFrom} 段，顶替液按本段深度重算）` : '',
          '', '', '', '', '', '', '', ''
        ],
        []
      ]
      const cols = this.columns.map(c => c.label)
      const body = st.rows.map(r => this.columns.map(c => {
        const v = r[c.prop]
        if (c.prop === 'no') return Number(v) || ''
        if (c.prop === 'stage' || c.prop === 'note' || c.prop === 'proppant') {
          return v == null ? '' : String(v)
        }
        return v === null || v === undefined || v === '' ? '' : Number(v)
      }))
      const tail = [
        [],
        ['本段合计', '', '', '', '', '', '', '', '', '', '', ''],
        ['液量（不含送塞送球）', st.summary.totalFluid, 'm³'],
        ['加砂量', st.summary.totalSand, 'm³'],
        ['砂液量', st.summary.totalLiquidVol, 'm³'],
        ['总时间', st.summary.totalMinutes, 'min'],
        ['顶替液', st.summary.flush, 'm³']
      ]

      const aoa = head.concat([cols]).concat(body).concat(tail)
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = this.columns.map(c => ({
        wch: c.prop === 'stage' ? 12 : (c.prop === 'proppant' || c.prop === 'note' ? 18 : 12)
      }))
      // 合并标题行，跟真实泵注表一样是居中大标题
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
        { s: { r: 2 }, e: { r: 2 } }
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `第${no}段`)

      const stamp = this.stampNow()
      const name = `${this.wellName || '泵注'}-第${no}段泵注程序-${stamp}.xlsx`
      XLSX.writeFile(wb, name)
      this.$message.success(`已导出「${name}」`)
    },

    /** 文件名时间戳：20261108_1402 */
    stampNow() {
      const d = new Date()
      const p = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
    },

    /* ============================================================
     *  从 Excel 粘贴（单段覆盖）
     *
     *  与「上传覆盖」同一条语义：只写目标段，其余段不动。
     *  区别只是数据从剪贴板来，省掉「另存为 xlsx → 再选文件」两步。
     * ============================================================ */

    /** 打开粘贴面板，并记下目标段 */
    openPaste(stageNo) {
      const no = Number(stageNo) || this.activeStage || 1
      this.pasteTarget = no
      this.pasteReset()
      this.pasteVisible = true
    },

    /** 清空面板里的粘贴状态（打开前 / 换一次粘贴都用同一套复位） */
    pasteReset() {
      this.pasteRaw = ''
      this.pasteMatrix = null
      this.pasteDirty = false
      this.pasteFrom = ''
      this.pasteResult = null
      this.pasteError = ''
      this.pasteMap = {}
      this.pasteKeepFlush = true
      this.pasteApplying = false
    },

    /** 面板打开后把光标放进粘贴区，用户直接 Ctrl+V 就行 */
    focusPasteArea() {
      const el = this.$refs.pasteArea
      if (!el) return
      const input = el.$refs && el.$refs.textarea
      if (input && input.focus) input.focus()
    },

    /**
     * 全局 Ctrl+V。
     *
     * 三种情况：
     *   ① 面板已开 + 焦点在粘贴区 → 交给浏览器写进 textarea，watch 会解析（这里直接放行）
     *   ② 面板已开 + 焦点不在粘贴区 → 用剪贴板内容填进去
     *   ③ 面板没开 → 判断像不像泵注表：像就打开面板并预填，不像就不打扰
     */
    onGlobalPaste(e) {
      const dt = e && (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))
      if (!dt) return

      // 焦点在粘贴区里：让浏览器自己写，watch('pasteRaw') 会解析
      if (this.pasteVisible && this.pasteFocus) return

      // 焦点在其他输入框（桥塞深度、单元格编辑框）：不抢，避免把数字粘错地方
      const active = document.activeElement
      const tag = active && active.tagName ? active.tagName.toUpperCase() : ''
      const inOtherInput = active && (
        tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable
      )
      if (inOtherInput && !this.pasteVisible) return

      const got = this.readClipboardMatrix(dt)
      if (!got.length) return

      const probe = matrixToPumpRows(got)
      // 不像泵注表（没认出任何行）→ 不打扰，尤其别把随手复制的文字弹成弹窗
      if (!probe.rows.length) {
        if (this.pasteVisible) this.$message.warning('这段内容里没读到泵注数据，请确认复制的是泵注表')
        return
      }

      e.preventDefault()
      if (!this.pasteVisible) this.openPaste(this.activeStage)
      this.fillPasteFromMatrix(got)
      this.$message.success(`已读入 ${probe.rows.length} 行，确认无误后点「写入第 ${this.pasteTarget} 段」`)
    },

    /** 粘贴区自己的 paste 事件：优先用 HTML（带合并信息），拿到后回写文本 */
    onPasteInArea(e) {
      const dt = e && (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))
      if (!dt) return
      const got = this.readClipboardMatrix(dt)
      if (!got.length) return
      // ⚠️ 必须 preventDefault：否则浏览器会把 text/plain 也塞进 textarea，
      //    两边都写一遍 → 内容重复一遍
      e.preventDefault()
      this.fillPasteFromMatrix(got)
    },

    /**
     * 把剪贴板矩阵灌进面板（三处入口共用：全局 Ctrl+V、面板内 Ctrl+V）。
     *
     * ⚠️ 赋值顺序不能反：先 pasteMatrix / pasteDirty，再 pasteRaw。
     *    pasteRaw 的 watcher 在赋值当场不会跑（Vue2 watcher 是异步队列），
     *    但只要在它跑之前把 pasteMatrix 和 pasteDirty 摆好就行 ——
     *    反过来说，如果先写 pasteRaw 再写 pasteMatrix，就等于让 watcher
     *    在一个「矩阵还是上一份」的状态下解析，会解析出旧结果。
     */
    fillPasteFromMatrix(matrix) {
      const tsv = this.matrixToTsv(matrix)
      this.pasteMatrix = matrix
      this.pasteDirty = false
      this.pasteRaw = tsv
      this.pasteFrom = this.pasteFrom || 'text'
      /*
       * 兜底：pasteRaw 与上次内容完全相同时 watcher 不会触发，面板会停在空态。
       * 这种情况只在「连按两次 Ctrl+V 粘同一份表」时出现，但用户会觉得第二次没反应，
       * 所以这里同步解析一次 —— watcher 若也跑了，结果一样，不会翻倍。
       */
      if (!this.pasteResult || !this.pasteResult.rows || !this.pasteResult.rows.length) {
        this.parsePasteText(tsv, matrix)
      }
    },

    /** 从剪贴板事件里读二维数组（优先 html，退回 tsv） */
    readClipboardMatrix(dt) {
      let html = ''
      let text = ''
      try { html = dt.getData('text/html') || '' } catch (err) { html = '' }
      try { text = dt.getData('text/plain') || '' } catch (err) { text = '' }

      if (html) {
        const m = parseHtmlTable(html)
        if (m.length && m.some(r => r.some(c => String(c || '').trim() !== ''))) {
          this.pasteFrom = 'html'
          return m
        }
      }
      if (text) {
        this.pasteFrom = 'text'
        return parseTsv(text)
      }
      return []
    },

    /**
     * 二维数组 → TSV 文本（回填 textarea 用）。
     *
     * ⚠️ 格内含 \t / \n / " 时必须整体加引号、内部 " 写成 ""，
     *    否则回填给 textarea 后再解析一次会裂行（'前置液\n（390m³）' 这类很常见）。
     */
    matrixToTsv(matrix) {
      return (matrix || []).map(row => (row || []).map(cell => {
        const s = String(cell == null ? '' : cell)
        if (/[\t\r\n"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
        return s
      }).join('\t')).join('\n')
    },

    /**
     * 解析 textarea 里的文本。
     *
     * matrix 由调用方决定给不给：给了就是「文本没动过、用剪贴板原矩阵（带合并信息）」，
     * 不给就按纯文本重新切。不在这里拿 this.pasteMatrix 反推，
     * 是因为 watcher 是被动触发的，判断「文本是否等于矩阵回写值」放在写入侧更可靠。
     */
    parsePasteText(text, matrix) {
      try {
        const m = matrix || parseTsv(text)
        const r = matrixToPumpRows(m)
        this.pasteResult = r
        // 列映射：把解析器认出来的列回填到面板，用户可改
        this.pasteMap = Object.assign({}, r.matchedCols || {})
        this.pasteError = r.rows.length ? '' : (r.warnings[0] || '没读到数据')
      } catch (err) {
        this.pasteResult = null
        this.pasteError = '解析失败：' + ((err && err.message) || err)
      }
    },

    clearPaste() {
      this.pasteRaw = ''
      this.pasteMatrix = null
      this.pasteDirty = false
      this.pasteFrom = ''
      this.pasteResult = null
      this.pasteError = ''
      this.pasteMap = {}
      this.$nextTick(() => this.focusPasteArea())
    },

    /** 手动改某一列的对应关系 → 重新按新映射读一遍 */
    onPasteMapChange(prop, colIdx) {
      const idx = Number(colIdx)
      this.pasteMap = Object.assign({}, this.pasteMap, { [prop]: idx < 0 ? null : idx })
      this.rebuildByMap()
    },

    /**
     * 按用户改过的列映射重新读行。
     *
     * 这里绕开 matrixToPumpRows（它内部会自己找表头），
     * 直接按 pasteMap 里的下标逐行取值 —— 用户改映射就是明确表态「按我说的来」。
     */
    rebuildByMap() {
      // 与 watcher 同口径：用户没手改过文本时用剪贴板矩阵（能还原合并表头），改过就重新切
      const matrix = (!this.pasteDirty && this.pasteMatrix)
        ? this.pasteMatrix
        : parseTsv(this.pasteRaw)
      if (!matrix || !matrix.length) return

      // 表头行以下才是数据；用户若把表头映射错了，这里仍从表头行之后开始
      // ⚠️ headerIdx 为 -1（真的判不出表头）时才从 0 开始
      const headerIdx = this.pasteHeaderIdx
      const start = headerIdx >= 0 ? headerIdx + 1 : 0
      // 防越界：表头就是最后一行时 start === length，循环自然不执行
      const cols = this.pasteMap
      const rows = []
      for (let i = start; i < matrix.length; i++) {
        const r = matrix[i] || []
        const stageRaw = cols.stage == null ? '' : String(r[cols.stage] == null ? '' : r[cols.stage]).trim()
        const nums = {}
        let hasNum = false
        NUM_PROPS.forEach(p => {
          const ci = cols[p]
          const raw = ci == null ? '' : String(r[ci] == null ? '' : r[ci]).replace(/[，,\s]/g, '')
          const n = raw === '' ? null : Number(raw)
          nums[p] = isFinite(n) ? n : null
          if (nums[p] != null) hasNum = true
        })
        if (!stageRaw && !hasNum) continue
        if (/^合\s*计/.test(stageRaw)) continue

        const row = Object.assign({
          no: rows.length + 1,
          stage: stageRaw.replace(/[（(][^（()）]*[)）]\s*$/, '').replace(/\n/g, ' ').trim(),
          stageRaw,
          note: cols.note == null ? '' : String(r[cols.note] == null ? '' : r[cols.note]).replace(/\n/g, ' ').trim(),
          proppant: cols.proppant == null ? '' : String(r[cols.proppant] == null ? '' : r[cols.proppant]).replace(/\n/g, ' ').trim()
        }, nums)
        rows.push(row)
      }

      // recalcKind 与解析器口径一致：续行继承上一行分组
      const kinds = []
      rows.forEach((row, i) => {
        const prev = i > 0 ? kinds[i - 1] : ''
        row.kind = guessRowKind(row.stage, row.ratio, prev)
        kinds.push(row.kind)
      })

      this.pasteResult = {
        rows,
        mode: 'header',
        warnings: rows.length ? [] : ['按当前列对应关系没读到数据行'],
        matchedCols: this.pasteMap
      }
      this.pasteError = rows.length ? '' : '按当前列对应关系没读到数据行'
    },

    /**
     * 把粘贴结果写入目标段。
     *
     * 与「上传覆盖」完全一致的落地方式：
     *   · 只写目标段，其他段不动
     *   · 自动解除该段的「复制来源」
     *   · 顶替液：保留粘贴原值（默认）或按本段桥塞深度重算
     */
    async applyPaste() {
      const no = Number(this.pasteTarget)
      const res = this.pasteResult
      if (!no || !res || !res.rows.length) return

      const oldStage = this.allStages.find(s => s.stageNo === no)
      const oldCount = oldStage ? oldStage.rows.length : 0
      const isRef = !!(this.stageDefs.find(d => d.stageNo === no) || {}).refStageNo

      try {
        await this.$confirm(
          `用粘贴的 ${res.rows.length} 行覆盖第 ${no} 段` +
          (oldCount ? `（原 ${oldCount} 行）` : '') +
          (isRef ? '\n该段当前是「复制其他段」，覆盖后会改为本段自带。' : ''),
          '覆盖本段数据',
          { type: 'warning', confirmButtonText: '覆盖', cancelButtonText: '取消' }
        )
      } catch (err) {
        return
      }

      this.pasteApplying = true
      try {
        let rows = res.rows.map(r => Object.assign({}, r))

        // 顶替液处理
        const d = this.stageDefs.find(x => x.stageNo === no)
        const depth = d ? Number(d.plugDepth) || 0 : 0
        rows = this.normalizeFlushRow(rows, this.pasteKeepFlush, depth)

        if (d) d.refStageNo = null
        this.ownRows = Object.assign({}, this.ownRows, { [no]: rows })
        this.stageDefs = this.stageDefs.slice()
        this.activeStage = no
        this.pageNum = 1
        this.pasteVisible = false
        this.$message.success(`已把 ${rows.length} 行写入第 ${no} 段（记得点右上角「保存」）`)
      } finally {
        this.pasteApplying = false
      }
    },

    /**
     * 顶替液归一化。
     *
     * keep = true  → 粘贴里带了顶替液行就原样保留（用户的实际施工值）
     * keep = false → 按本段桥塞深度重算，位置替换原顶替液行
     * 粘贴里没有顶替液行且本段有深度 → 末尾补一行
     */
    normalizeFlushRow(rows, keep, depth) {
      const out = rows.slice()
      const idx = out.findIndex(r => r.kind === 'flush')
      if (keep && idx >= 0) return out

      const cum = out.length ? out[out.length - 1].cumSand : null
      const fresh = buildFlushRow(depth, this.form.maxRate, cum)
      if (idx >= 0) {
        fresh.no = out[idx].no
        out[idx] = fresh
      } else if (depth > 0) {
        fresh.no = out.length + 1
        out.push(fresh)
      }
      out.forEach((r, i) => { r.no = i + 1 })
      return out
    },

    /** 面板预览里的数字显示 */
    numText(v) {
      if (v === null || v === undefined || v === '') return ''
      const n = Number(v)
      if (!isFinite(n)) return ''
      const r = Math.round(n * 100) / 100
      return Number.isInteger(r) ? String(r) : r.toFixed(2)
    },

    /** 列号 → Excel 列字母（0→A） */
    colLetter(i) {
      let n = Number(i) + 1
      let s = ''
      while (n > 0) {
        const m = (n - 1) % 26
        s = String.fromCharCode(65 + m) + s
        n = Math.floor((n - 1) / 26)
      }
      return s
    },

    /** 某列下拉框当前值的完整文本（下拉框窄，靠 title 悬浮看全） */
    colHeaderText(colIdx) {
      const idx = Number(colIdx)
      if (colIdx == null || idx < 0) return '（无）'
      const h = (this.pasteHeaders || [])[idx]
      return this.colLetter(idx) + ' ' + (h || '(空)')
    },

    /* ============================================================
     *  存储：读已保存 / 写库
     * ============================================================ */

    /**
     * 恢复本井已保存的泵注程序（结构化表，按版本）。
     *
     * <p><b>段数不跟着旧版本走</b>（2026-11-15 改）：
     * 老实现直接 {@code this.stageDefs = rec.stages}，于是「保存时是 2 段」的旧版本
     * 会把刚从地质设计/射孔方案读到的 9 段<b>改回 2 段</b> ——
     * 实测本井就是这样：顶部标签写着「9 段」，段数输入框却是 2，下面只有 2 张泵注表。
     *
     * <p>现在的口径：
     * <ul>
     *   <li><b>段数</b>：以本次读到的段数为准（地质设计 → 射孔方案 → 手填），
     *       保存版本里多出来的段忽略，少的段由骨架补齐；</li>
     *   <li><b>桥塞深度 / 引用关系 / 明细行</b>：按段号从保存版本里取，用户确认过的内容照旧；</li>
     *   <li>两者段数不一致时只提示一次，不擅自删数据、也不擅自丢段。</li>
     * </ul>
     * 这样「改了地质设计段数 → 重新进页面」能立刻生效，
     * 而「用户上次填好的 9 段明细」也不会因为段数一致而丢。
     *
     * @returns {Boolean} 是否恢复到了内容
     */
    async loadSaved() {
      if (!this.wbWellId) return false
      try {
        const res = await getCurrentPumpTable(this.wbWellId)
        const rec = res && res.data
        if (!rec || !rec.stages || !rec.stages.length) return false

        // 参数：优先用保存时的（否则重算出来的和用户看到的不一样）
        this.form = Object.assign({}, DEFAULT_FORM, {
          maxRate: rec.maxRate || DEFAULT_FORM.maxRate,
          maxRatio: rec.maxRatio || DEFAULT_FORM.maxRatio,
          padFluid: rec.padFluid == null ? DEFAULT_FORM.padFluid : rec.padFluid,
          carryFluid: rec.carryFluid == null ? DEFAULT_FORM.carryFluid : rec.carryFluid,
          proppant: rec.proppant || DEFAULT_FORM.proppant
        })

        // 段数：沿用当前骨架（地质设计/射孔方案给的），不跟随保存版本
        const target = this.stageDefs.length || rec.stages.length
        const savedByNo = {}
        rec.stages.forEach(s => {
          const no = Number(s.stageNo)
          if (isFinite(no)) savedByNo[no] = s
        })

        const next = []
        for (let i = 1; i <= target; i++) {
          const cur = this.stageDefs.find(d => d.stageNo === i) || {}
          const s = savedByNo[i]
          const savedPlug = s && s.plugDepth != null ? Number(s.plugDepth) : null
          const curPlug = cur.plugDepth == null ? null : Number(cur.plugDepth)
          // 🔴 保存值是 0/空、而骨架（射孔方案）有真值时，不能拿 0 去盖真值：
          //    本井旧版只存了 2 段且 plugDepth=0，第 2 段的 2758（射孔方案给的）
          //    就这样被冲成 0，页面上第 2 段桥塞位置空着、还误报「泵注深度未填」。
          //    0 在业务上等于「没填」，不是「填了 0 米」—— 所以只有保存值 > 0 才算用户定过。
          const savedHasPlug = savedPlug != null && savedPlug > 0
          next.push({
            stageNo: i,
            // 保存版本里有这段：用保存的桥塞深度与引用关系（用户确认过的）
            refStageNo: s && s.refStageNo && s.refStageNo !== i ? s.refStageNo : null,
            plugDepth: savedHasPlug ? savedPlug : (curPlug || 0),
            // 只有「保存版本里这段有真值」才算用户定过深度，
            // 否则新增段/旧版零值段会被误标成已编辑，后续射孔重取也刷不到新值
            plugDepthTouched: savedHasPlug,
            startDepth: s && s.startDepth != null ? s.startDepth : (cur.startDepth == null ? null : cur.startDepth),
            endDepth: s && s.endDepth != null ? s.endDepth : (cur.endDepth == null ? null : cur.endDepth)
          })
        }
        this.stageDefs = next
        this.stageCountInput = next.length || 1

        // 段数不一致时提示一次：让用户知道「按最新地质设计段数展开，旧版多/少的段怎么处理了」
        if (Number(rec.stageCount || rec.stages.length) !== target) {
          const oldN = Number(rec.stageCount || rec.stages.length)
          this.$message.info(
            `本井已保存过 ${oldN} 段的旧版本，本次按 ${this.stageSourceName}的 ${target} 段展开；` +
            `旧版本的明细已按段号带入，缺的段请上传泵注表。`
          )
        }

        // 行数据：只灌「非引用段」（引用段本来就没存行）
        const rows = {}
        rec.stages.forEach(s => {
          if (s.refStageNo) return
          if (s.rows && s.rows.length) rows[s.stageNo] = s.rows.map(r => this.rowFromSaved(r))
        })
        this.ownRows = rows

        this.savedVersion = rec.versionNo || null
        this.savedTableId = rec.tableId || ''
        if (!this.allStages.some(s => s.stageNo === this.activeStage)) this.activeStage = 1
        return true
      } catch (e) {
        // 表还没建（DDL 未执行）也会走到这里 —— 不能让它挡住页面，静默降级成公式派生
        return false
      }
    },

    /** 把后端存的行还原成渲染用的行（派生列重新按公式算出来） */
    rowFromSaved(r) {
      const row = {
        no: r.rowNo,
        stage: r.stageName || '',
        stageGroup: r.stageGroup || '',
        fluid: r.fluid,
        ratio: r.ratio,
        rate: r.rate,
        // 原表值带上；老版本（这两列还没落库时存的）为 null，recomputeRow 会自动按公式补
        liquidVol: r.liquidVol == null ? null : r.liquidVol,
        minutes: r.minutes == null ? null : r.minutes,
        note: r.note || '',
        proppant: r.proppant || '',
        kind: this.kindOfGroup(r.stageGroup, r.stageName)
      }
      return this.recomputeRow(row, null)
    },

    /** stageGroup / stageName → 前端 kind（决定行底色与是否计入合计） */
    kindOfGroup(group, name) {
      const g = String(group || '').toUpperCase()
      const n = String(name || '')
      if (g === 'PLUG' || n.indexOf('泵送桥塞') >= 0) return 'plug'
      if (g === 'BALL' || n.indexOf('送球') >= 0) return 'ball'
      if (g === 'FLUSH' || n.indexOf('顶替') >= 0) return 'flush'
      if (g === 'PAD' || n.indexOf('前置') >= 0) return 'pad'
      if (g === 'CARRY' || n.indexOf('携砂') >= 0) return 'carry'
      return ''
    },

    /**
     * 保存到结构化表。
     *
     * 提交内容 = 段骨架（含引用关系与桥塞深度）+ 各「非引用段」的明细行。
     * 引用段只提交骨架，rows 留空 —— 后端也会再兜一层强制清空。
     */
    async saveAll() {
      if (!this.wbWellId) {
        this.$message.warning('未识别到工作台井号，无法保存（请从单井工作台进入本页）')
        return
      }
      if (!this.stageDefs.length) {
        this.$message.warning('还没有任何泵注段，请先设置段数')
        return
      }
      this.saving = true
      try {
        const stages = this.stageDefs
          .slice()
          .sort((a, b) => a.stageNo - b.stageNo)
          .map(d => {
            const isRef = !!d.refStageNo
            const rows = isRef ? [] : (this.ownRows[d.stageNo] || []).map((r, i) => ({
              rowNo: i + 1,
              stageName: r.stage || '',
              stageGroup: this.groupOfKind(r.kind, r.stage),
              fluid: numOrNull(r.fluid),
              ratio: numOrNull(r.ratio),
              rate: numOrNull(r.rate),
              // 原表值：粘贴/上传读到的砂液量与阶段时间，空则由后端按公式算
              liquidVol: numOrNull(r.liquidVol),
              minutes: numOrNull(r.minutes),
              note: r.note || '',
              proppant: r.proppant || ''
            }))
            return {
              stageNo: d.stageNo,
              refStageNo: d.refStageNo || null,
              plugDepth: numOrNull(d.plugDepth),
              startDepth: numOrNull(d.startDepth),
              endDepth: numOrNull(d.endDepth),
              rows
            }
          })

        const payload = {
          wbWellId: this.wbWellId,
          wellName: this.wellName,
          maxRate: this.form.maxRate,
          maxRatio: this.form.maxRatio,
          padFluid: this.form.padFluid,
          carryFluid: this.form.carryFluid,
          proppant: this.form.proppant,
          sourceType: this.upload ? 'UPLOAD' : 'FORMULA',
          /*
           * 小压测试档位（12方/15方）：只是「这口井选了哪一档」的记号。
           * 表数据本身内置在后端 spec 里，不随本接口上传 —— 泵注表和小压测试表
           * 是两张不同的表，这里只借泵注表的版本记录把档位存住，
           * 让报告生成端换电脑/换人也能取回同一档。
           */
          pretestVariant: loadPreTestVariant(this.wbWellId),
          stages
        }
        const res = await savePumpTable(payload)
        const rec = res && res.data
        this.savedVersion = rec && rec.versionNo ? rec.versionNo : this.savedVersion
        this.savedTableId = rec && rec.tableId ? rec.tableId : ''
        const refs = stages.filter(s => s.refStageNo).length
        this.$message.success(
          `保存成功${this.savedVersion ? '（第 ' + this.savedVersion + ' 版）' : ''}：` +
          `${stages.length} 段` + (refs ? `，其中 ${refs} 段引用其他段` : '')
        )
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || '未知错误'))
      } finally {
        this.saving = false
      }
    },

    groupOfKind(kind, name) {
      if (kind === 'plug') return 'PLUG'
      if (kind === 'ball') return 'BALL'
      if (kind === 'pad') return 'PAD'
      if (kind === 'carry') return 'CARRY'
      if (kind === 'flush') return 'FLUSH'
      const n = String(name || '')
      if (n.indexOf('顶替') >= 0) return 'FLUSH'
      return ''
    },

    /* ============================================================
     *  编辑
     * ============================================================ */

    /** 手工改过桥塞深度后，本段顶替液行要跟着重算 */
    refreshFlushRow(stageNo) {
      const rows = this.ownRows[stageNo]
      if (!rows || !rows.length) return
      const d = this.stageDefs.find(x => x.stageNo === Number(stageNo))
      const idx = rows.findIndex(r => r.kind === 'flush')
      const cum = rows.length ? rows[rows.length - 1].cumSand : null
      const fresh = buildFlushRow(d ? d.plugDepth : 0, this.form.maxRate, cum)
      if (idx >= 0) {
        fresh.no = rows[idx].no
        rows[idx] = fresh
      } else {
        fresh.no = rows.length + 1
        rows.push(fresh)
      }
    },

    onCellEdit(rowIndex, prop, val) {
      this.commitCell(rowIndex, prop, val)
    },

    /** 失焦兜底：只有值真的变了才落库，避免与 change 重复刷新 */
    onCellBlur(rowIndex, prop, val) {
      const cur = this.cellCurrent(rowIndex, prop)
      const a = cur == null ? '' : String(cur)
      const b = val == null ? '' : String(val)
      if (a === b) return
      if (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) === Number(b)) return
      this.commitCell(rowIndex, prop, val)
    },

    cellCurrent(rowIndex, prop) {
      const st = this.current
      if (!st) return null
      const row = st.rows[rowIndex]
      return row ? row[prop] : null
    },

    /**
     * 写入一格。
     *
     * 统一落到 ownRows（本段自带行）里，再由 allStages 整体重算派生列与合计。
     * 引用段不允许编辑（表格里已经不给输入框），因为它的数据源是别的段。
     */
    commitCell(rowIndex, prop, val) {
      const stageNo = this.activeStage
      const stage = this.allStages.find(s => s.stageNo === stageNo)
      if (stage && stage.resolvedFrom) {
        this.$message.warning(`第 ${stageNo} 段复制自第 ${stage.resolvedFrom} 段，请到源段修改`)
        return
      }

      // 首次编辑时把「当前展示的行」整体物化成本段自己的行
      if (!this.ownRows[stageNo] || !this.ownRows[stageNo].length) {
        this.ownRows[stageNo] = stage.rows.map(r => Object.assign({}, r))
      }
      const rows = this.ownRows[stageNo]
      const row = rows[rowIndex]
      if (!row) return

      if (prop === 'fluid' || prop === 'ratio' || prop === 'rate') {
        const num = Number(val)
        if (!isFinite(num) || num <= 0) {
          this.$message.warning('请输入大于 0 的数值')
          return
        }
        row[prop] = prop === 'ratio' ? Math.round(num) : num
        /*
         * 用户亲手改了净液量/砂比/排量 → 这一行的砂液量与阶段时间必须跟着公式走。
         * 先清掉留存的粘贴原值，否则 recomputeRow 会认为「有原值就保留」，
         * 改了净液量砂液量却纹丝不动，看起来像没生效。
         */
        row.liquidVol = null
        row.minutes = null
      } else {
        row[prop] = String(val == null ? '' : val)
      }

      // 整段按公式重算：砂量/砂浓度/砂液量/时间/累积砂量都依赖被改的这三列
      this.ownRows[stageNo] = this.recomputeStage(rows)
      this.ownRows = Object.assign({}, this.ownRows)
    },

    /**
     * 段内全量重算（自上而下刷累积砂量）。
     * 与 pumpProgram.js 的公式保持同一口径，避免页面值与报告值对不上。
     */
    recomputeStage(rows) {
      let cum = 0
      return rows.map((r, i) => {
        const out = this.recomputeRow(r, null)
        out.no = i + 1
        return out
      })
    },

    /**
     * 行内派生列重算。
     *
     * @param {Object} r 行
     * @param {Object} edits 预留（当前未用）
     *
     * ⚠️ `liquidVol` / `minutes` 这两列**有原值就保留，没有才按公式算**。
     *    现场 Excel 里这两列是施工队自己填的实际值，不一定等于
     *    `fluid + sand*1.58/2.62` 与 `liquidVol/rate` 这套折算；
     *    无条件用公式覆盖，等于把用户粘进来/传上来的数偷偷换掉。
     *    判断依据是 `r.liquidVol != null`，也就是「解析器读到过」。
     *    只有在净液量/砂比/排量被用户手改时，才会主动走公式（见 commitCell）。
     */
    recomputeRow(r, edits) {
      const out = Object.assign({}, r)
      const fluid = Number(out.fluid) || 0
      const ratio = out.ratio == null || out.ratio === '' ? null : Number(out.ratio)
      const rate = Number(out.rate) || 0
      const keepLiquidVol = out.liquidVol != null && out.liquidVol !== ''
      const keepMinutes = out.minutes != null && out.minutes !== ''

      if (ratio && ratio > 0) {
        out.conc = Math.round(ratio * SAND_CONC_COEF * 10) / 10
        out.sand = Math.round(fluid * ratio / 100 * 100) / 100
        if (!keepLiquidVol) out.liquidVol = Math.round((fluid + out.sand * SAND_LIQUID_RATIO) * 100) / 100
      } else {
        out.conc = null
        out.sand = null
        if (!keepLiquidVol) out.liquidVol = Math.round(fluid * 100) / 100
      }

      if (!keepMinutes) {
        const lv = Number(out.liquidVol) || 0
        out.minutes = rate > 0 ? Math.round(lv / rate * 100) / 100 : 0
      }
      return out
    },

    /* ============================================================
     *  分页 / 展示
     * ============================================================ */

    onPageChange(p) {
      this.pageNum = p
    },

    pageSizeChange(s) {
      this.pageSize = s
      this.pageNum = 1
    },

    compactRowStyle() {
      return { height: '30px' }
    },

    compactCellStyle() {
      return { padding: '2px 0' }
    },

    display(row, prop) {
      if (prop === 'cumSand' && row.cumSand == null) return '-'
      if ((prop === 'conc' || prop === 'sand' || prop === 'ratio') && row[prop] == null) return '-'
      const v = row[prop]
      if (v === null || v === undefined || v === '') return ''
      if (typeof v === 'number' && NUM_FMT_PROPS.indexOf(prop) >= 0) {
        const n = Math.round(v * 100) / 100
        return Number.isInteger(n) ? n : n.toFixed(2)
      }
      return v
    },

    rowClass({ row }) {
      if (row.kind === 'plug' || row.kind === 'ball') return 'pp-row-head'
      if (row.kind === 'flush') return 'pp-row-flush'
      if (row.stage === '前置液' || row.stage === '携砂液' || row.stage === '顶替液') return 'pp-row-stage'
      return ''
    },

    /* ============================================================
     *  动作
     * ============================================================ */

    resetAll() {
      this.$confirm('恢复默认参数会清空所有手动修改与复制关系（段数与桥塞深度保留），确定继续？', '提示', {
        type: 'warning'
      }).then(() => {
        this.form = Object.assign({}, DEFAULT_FORM)
        this.ownRows = {}
        this.upload = null
        this.stageDefs.forEach(d => { d.refStageNo = null })
        this.stageDefs = this.stageDefs.slice()
        this.activeStage = 1
        this.pageNum = 1
        this.$message.success('已恢复默认参数')
      }).catch(() => {})
    },

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
     * 从 sessionStorage 里读当前井号的井库 ID。
     *
     * <p>必须排除「值其实是井名」的情况：井名一旦被当成井库 ID 传给单井工作台，
     * 页面会请求 {@code /v1/wells/安13-7-3平3}，后端返回「井不存在」。
     * 丢空后调用方退化成本地井 {@code local~<wbWellId>}，至少页面能正常打开。</p>
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
      } catch (e) { /* ignore */ }
      return ''
    }
  }
}

/**
 * 判断一个字符串「像井名」而不是「井库 ID」。
 *
 * <p>井名形态：「安13-7-3平3」；井库 ID 形态：「HB00022534」。
 * 判定口径刻意宽松（宁可误判成井名）：井库 ID 不含中文、不以「井」结尾、不带空格。
 * 误判代价只是退化成本地井，远小于跳进必然报错的页面。</p>
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

function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

/** 粘贴面板里可手动指定对应关系的字段（顺序即展示顺序） */
/*
 * 列映射面板里允许用户手动指定的字段。
 *
 * ⚠️ 顺序即展示顺序，**必须覆盖 NUM_PROPS 全部字段**，否则该字段认错时
 *    用户没有任何办法纠正（上一轮「砂液量/阶段时间粘不进来」就是
 *    liquidVol/minutes 根本没出现在这个列表里，只能改代码）。
 *    `no` 不参与数值读取（行号自动重排），但认错会让「序号列」占位，一并向用户暴露。
 */
const PASTE_MAP_FIELDS = [
  { prop: 'stage', label: '阶段' },
  { prop: 'fluid', label: '净液量' },
  { prop: 'liquidVol', label: '砂液量' },
  { prop: 'ratio', label: '砂比' },
  { prop: 'conc', label: '砂浓度' },
  { prop: 'sand', label: '砂量' },
  { prop: 'floatSand', label: '自悬浮砂量' },
  { prop: 'cumSand', label: '累积砂量' },
  { prop: 'rate', label: '排量' },
  { prop: 'minutes', label: '阶段时间' },
  { prop: 'note', label: '备注' },
  { prop: 'proppant', label: '支撑剂' }
]

/**
 * 参与数值读取的字段（rebuildByMap 用）。
 *
 * ⚠️ 从 PASTE_MAP_FIELDS 派生，**不要手工再维护一份**：
 *    早先两处各写一份，PASTE_MAP_FIELDS 漏了 liquidVol/minutes，
 *    结果这两列即使认对了也没法在面板里手动纠正。
 *    `stage`/`note`/`proppant` 是文本列，单独取值，不在数值字段里。
 */
const NUM_PROPS = PASTE_MAP_FIELDS
  .map(f => f.prop)
  .filter(p => p !== 'stage' && p !== 'note' && p !== 'proppant')

/**
 * 阶段名 → 分组 kind。
 * 与 pumpPaste.js 的 guessKind 同一口径，改一处必须两处一起改
 * （面板手动改列映射后走的是本地重算，不能依赖解析器）。
 */
function guessRowKind(stage, ratio, prev) {
  const s = String(stage || '')
  if (/泵送桥塞|送桥塞|桥塞/.test(s)) return 'plug'
  if (/送球/.test(s)) return 'ball'
  if (/顶替/.test(s)) return 'flush'
  if (/前置|活性水|滑溜水|基液/.test(s) && ratio == null) return 'pad'
  if (ratio != null) return 'carry'
  if (!s && prev) return prev
  return ''
}
</script>

<style lang="scss" scoped>
.pp-page {
  padding: 16px 20px 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  box-sizing: border-box;
}

/* ---------- 顶部 ---------- */
.pp-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 14px 20px;
  margin-bottom: 14px;
  border: 1px solid #ebeef5;

  &__left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  &__icon {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    background: #e8f3ff;
    color: #2f7ee0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2d3d;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__meta {
    margin-top: 4px;
    font-size: 12px;
    color: #8492a6;
    display: flex;
    gap: 16px;
  }

  /* 段数来源明细：只在回落/不一致时出现，弱化成「说明」而不是告警 */
  &__source {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: #b88230;
    display: flex;
    align-items: flex-start;
    gap: 4px;

    i {
      margin-top: 2px;
    }
  }

  &__warn {
    color: #e6a23c;
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

/* ---------- 主体 ---------- */
.pp-body {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.pp-side {
  width: 366px;
  flex: 0 0 366px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pp-main {
  flex: 1;
  min-width: 0;
}

.pp-card {
  border-radius: 8px;

  &__header {
    font-size: 14px;
    font-weight: 600;
    color: #1f2d3d;
    display: flex;
    align-items: center;
    gap: 8px;

    &--flex {
      justify-content: space-between;
    }
  }

  &__sub {
    font-size: 11px;
    font-weight: 400;
    color: #a0aec0;
  }

  &--stages {
    /* 段配置卡不用撑满，表格自己滚动 */
    ::v-deep .el-card__body {
      padding: 10px 12px 12px;
    }
  }
}

/* ---------- 表单 ---------- */
.pp-field {
  margin-bottom: 14px;

  &__label {
    display: block;
    font-size: 12px;
    color: #606266;
    margin-bottom: 6px;
  }

  &__hint {
    margin-top: 4px;
    font-size: 11px;
    color: #a0aec0;
    line-height: 1.5;
  }
}

.pp-tip {
  margin-top: 4px;

  &__body {
    font-size: 11px;
    line-height: 1.7;
    color: #606266;
  }
}

/* ---------- 段配置 ---------- */
.pp-stageadd {
  display: flex;
  align-items: center;
  gap: 4px;

  &__label {
    font-size: 12px;
    font-weight: 400;
    color: #8492a6;
  }
}

.pp-stagehint {
  font-size: 11px;
  color: #a0aec0;
  line-height: 1.6;
  margin-bottom: 8px;
}

.pp-stagetable {
  ::v-deep .el-table__cell {
    padding: 2px 0;
  }

  ::v-deep .el-input__inner {
    height: 24px;
    line-height: 24px;
    padding: 0 4px;
    font-size: 12px;
    text-align: right;
  }
}

/* 「复制来源」下拉：上面那条 text-align:right + padding:0 4px 是针对数字输入框的，
   套到 el-select 上会把「本段自带」挤成竖排 4 行 —— 这里必须覆盖回左对齐并留出箭头位 */
.pp-refsel {
  width: 100%;

  ::v-deep .el-input__inner {
    text-align: left;
    /* 右侧给箭头留位：原 18px 会让「同第 10 段」被箭头压住一截 */
    padding-right: 22px;
    padding-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.pp-stageno {
  font-weight: 600;
  color: #1f2d3d;

  &.is-ref {
    color: #b57b00;
  }
}

.pp-ref-select {
  ::v-deep .el-input__inner {
    color: #b57b00;
    font-weight: 600;
  }
}

.pp-batchbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;

  /* 批量操作靠左，单段上传/导出靠右 */
  &__right {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
}

/* 段配置行内的上传/粘贴/导出图标按钮 */
.pp-rowops {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;

  &__btn {
    padding: 0 3px;
    font-size: 14px;
    color: #2f7ee0;

    &:hover {
      color: #1a5fb4;
    }

    &--paste {
      color: #e6a23c;

      &:hover {
        color: #c8871f;
      }
    }
  }
}

/* 段配置卡底部的说明 */
.pp-paramnote {
  margin-top: 10px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #7a869a;
  background: #f7f9fc;
  border-left: 3px solid #c6d8ef;
  border-radius: 2px;

  i {
    margin-right: 4px;
    color: #2f7ee0;
  }
}

/* 隐藏的原生文件选择框 */
.pp-hiddenfile {
  display: none;
}

/* ---------- 段切换 ---------- */
.pp-tablebar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;

  &__ops {
    display: flex;
    gap: 6px;
  }
}

.pp-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 70%;

  &__item {
    padding: 2px 10px;
    font-size: 12px;
    font-weight: 400;
    border-radius: 10px;
    background: #f0f2f5;
    color: #606266;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: #e1eaf5;
    }

    &.is-active {
      background: #2f7ee0;
      color: #fff;
    }

    /* 引用其他段的段签：用虚线下划线区分，点击前就能看出不是独立表 */
    &.is-ref {
      box-shadow: inset 0 0 0 1px #e6c98a;
    }
  }

  &__link {
    font-size: 11px;
    margin-left: 2px;
  }
}

/* ---------- 空段（还没有任何数据） ---------- */
.pp-nodata {
  padding: 40px 20px;
  text-align: center;
  background: #fafbfc;
  border: 1px dashed #d9e1ec;
  border-radius: 4px;

  > i {
    font-size: 36px;
    color: #b9c6d8;
  }

  &__title {
    margin: 10px 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #4a5568;
  }

  &__hint {
    margin: 0 0 14px;
    font-size: 12px;
    line-height: 1.7;
    color: #8b98a9;
  }

  &__ops {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
}

/* ---------- 引用提示条 ---------- */
.pp-refbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #fffbf0;
  border: 1px solid #f0dfb8;
  border-radius: 6px;
  font-size: 12px;
  color: #8a6410;

  i {
    font-size: 14px;
  }

  &__text {
    flex: 1;
    line-height: 1.6;

    b {
      color: #b57b00;
    }
  }

  &--src {
    background: #f4f8ff;
    border-color: #cfe0f7;
    color: #3b6ea8;

    b {
      color: #2f7ee0;
    }
  }
}

/* ---------- 自动带入状态条 ---------- */
.pp-auto {
  margin-bottom: 12px;
}

/* ---------- 行数条 + 分页 ---------- */
.pp-rowsbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #f7f9fc;
  border: 1px solid #ebeef5;
  border-radius: 6px;

  &__text {
    font-size: 12px;
    color: #8492a6;

    b {
      color: #2f7ee0;
      font-weight: 600;
      padding: 0 2px;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__compact {
    ::v-deep .el-checkbox__label {
      font-size: 12px;
      padding-left: 6px;
    }
  }
}

.pp-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* ---------- 表格 ---------- */
.pp-cell-input {
  ::v-deep .el-input__inner {
    height: 24px;
    line-height: 24px;
    padding: 0 6px;
    text-align: right;
    font-size: 12px;
  }
}

/* 单元格原生 input（替代 el-input，见模板处注释）——外观对齐 el-input--mini，去掉默认描边 */
.pp-cell-input--native {
  width: 100%;
  height: 24px;
  line-height: 24px;
  padding: 0 6px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #303133;
  font-size: 12px;
  font-family: inherit;
  text-align: right;
  outline: none;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: #dcdfe6;
  }

  &:focus {
    border-color: #409eff;
    background: #fff;
  }
}

::v-deep .pp-row-head {
  background: #fafafa;
  color: #909399;
}

::v-deep .pp-row-flush {
  background: #fff8e6;
}

::v-deep .pp-row-stage {
  font-weight: 600;
}

/* ---------- 合计 ---------- */
.pp-sum {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #f7f9fc;
  border-radius: 6px;
  border: 1px solid #ebeef5;

  &__item {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 150px;
  }

  &__label {
    font-size: 12px;
    color: #8492a6;
  }

  &__value {
    font-size: 16px;
    font-weight: 600;
    color: #2f7ee0;
  }

  &__unit {
    font-size: 11px;
    color: #a0aec0;
  }
}

/* ---------- 备注 ---------- */
.pp-warn {
  margin-top: 12px;
  border-radius: 6px;
}

.pp-notes {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fbfbfb;
  border-radius: 6px;
  border: 1px dashed #e4e7ed;

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: #606266;
    margin-bottom: 8px;
  }

  &__list {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: #7a869a;
    line-height: 1.8;
  }
}

.pp-empty {
  padding: 40px 0;
  text-align: center;
  color: #a0aec0;

  i {
    font-size: 32px;
  }

  p {
    margin-top: 8px;
    font-size: 13px;
  }
}

/* ============================================================
 *  从 Excel 粘贴（预览面板）
 * ============================================================ */
.pp-pastedlg__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;

  i {
    color: #e6a23c;
  }
}

.pp-pastedlg__sub {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: #8b98a9;
}

.pp-pastedlg__body {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.pp-pastedlg__footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pp-pastedlg__tip {
  margin-right: auto;
  font-size: 12px;
  color: #8b98a9;

  i {
    margin-right: 3px;
    color: #2f7ee0;
  }
}

/* 粘贴区 */
.pp-pastearea {
  border: 1px dashed #d9e1ec;
  border-radius: 4px;
  padding: 8px;
  background: #fbfcfe;
  transition: border-color 0.2s, background 0.2s;

  &.is-focus {
    border-color: #2f7ee0;
    background: #f6faff;
  }

  &.is-filled {
    border-style: solid;
    border-color: #cfe0f5;
  }

  &__hint {
    margin-top: 6px;
    font-size: 12px;
    color: #8b98a9;

    i {
      margin-right: 3px;
      color: #2f7ee0;
    }
  }
}

/* 解析结果与选项 */
.pp-pastecfg {
  margin-top: 12px;
}

.pp-pastecfg__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  background: #f7f9fc;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.pp-pastecfg__label {
  color: #8b98a9;
}

.pp-pastecfg__num {
  font-size: 15px;
  color: #2f7ee0;
}

.pp-pastecfg__unit {
  color: #8b98a9;
}

/* 列对应 */
/*
 * 列对应面板。
 * ⚠️ 必须用**固定列宽网格**（repeat(4, minmax(0,1fr)) + 每格不换行）：
 *    早先用 flex + flex-wrap + 下拉框硬编码 96px，结果
 *      · 「H 砂液量(m³)」被截断成「H 砂液量(」
 *      · 行末空位把下一项顶下去，看起来像「列对应」跟「排量」串行
 *    网格 + minmax(0,1fr) 能让每格等宽收缩、列对齐，不会出现视觉错位。
 */
.pp-pastemap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  &__label {
    flex: none;
    font-size: 12px;
    color: #8b98a9;
    line-height: 28px;
  }

  &__list {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px 14px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__field {
    flex: none;
    /* 72px 刚好容下最长字段名「自悬浮砂量」（5 个汉字 × 12px ≈ 60px + 余量），
       写小了会被 ellipsis 截成「自悬浮…」，用户看不懂是哪个字段 */
    width: 72px;
    font-size: 12px;
    color: #606266;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 下拉框撑满剩余宽度；min-width:0 是关键，否则 el-select 不肯收缩会溢出格子 */
  &__sel {
    flex: 1;
    min-width: 0;
  }
}

/* 窄屏（弹窗本身不宽）退成 3 列，避免每格被压到看不清 */
@media (max-width: 1280px) {
  .pp-pastemap__list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* 预览表 */
.pp-pastepreview {
  margin-top: 10px;
  max-height: 240px;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  &__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      color: #4a5568;
      background: #f5f7fa;
      border-bottom: 1px solid #e4e9f0;
      white-space: nowrap;
    }

    td {
      padding: 5px 8px;
      color: #3d4757;
      border-bottom: 1px solid #f2f5f9;
      white-space: nowrap;
    }

    tbody tr:hover td {
      background: #f7faff;
    }

    /* 阶段分组底色：与右侧表格保持同一套视觉语言 */
    tr.pp-k-plug td,
    tr.pp-k-ball td {
      background: #f4f7fb;
      color: #7a869a;
    }

    tr.pp-k-flush td {
      background: #fffaf0;
    }

    tr.pp-k-pad td {
      background: #fbfdff;
    }
  }

  .pp-c {
    text-align: center;
    color: #a0aec0;
  }

  .pp-n {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .pp-ell {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.pp-pastewarn {
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #a06a10;
  background: #fffbf0;
  border-left: 3px solid #f0c78a;
  border-radius: 2px;

  i {
    margin-right: 3px;
  }
}

.pp-pasteerr {
  margin-top: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: #c0392b;
  background: #fef6f5;
  border-left: 3px solid #f0a8a0;
  border-radius: 2px;
}
</style>
