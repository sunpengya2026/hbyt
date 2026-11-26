<template>
  <div class="annotation-extract-container">
    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div :class="['step', { active: currentStep === 1, completed: currentStep > 1 }]">
        <div class="step-number">
          <i v-if="currentStep > 1" class="el-icon-check"></i>
          <span v-else>1</span>
        </div>
        <div class="step-label">上传文档</div>
      </div>
      <div :class="['step-line', { active: currentStep > 1 }]"></div>
      <div :class="['step', { active: currentStep === 2, completed: currentStep > 2 }]">
        <div class="step-number">
          <i v-if="currentStep > 2" class="el-icon-check"></i>
          <span v-else>2</span>
        </div>
        <div class="step-label">读取批注</div>
      </div>
      <div :class="['step-line', { active: currentStep > 2 }]"></div>
      <div :class="['step', { active: currentStep === 3 }]">
        <div class="step-number">3</div>
        <div class="step-label">记录获取方式</div>
      </div>
    </div>

    <!-- 步骤1：上传文档 -->
    <div v-show="currentStep === 1" class="panel">
      <div class="panel-header">
        <span><i class="el-icon-upload2"></i> 步骤1：上传文档</span>
      </div>
      <div class="panel-body">
        <el-upload
          ref="upload"
          class="upload-area"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
          accept=".docx"
        >
          <div class="upload-content">
            <i class="el-icon-upload"></i>
            <div class="upload-text">将Word文档拖到此处，或<em>点击上传</em></div>
            <div class="upload-tip">支持 .docx 格式</div>
          </div>
        </el-upload>

        <!-- 已上传文件 -->
        <div v-if="uploadedFile" class="uploaded-file">
          <i class="el-icon-document word-icon"></i>
          <span class="file-name">{{ uploadedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(uploadedFile.size) }}</span>
          <el-button type="primary" size="small" @click="readAnnotations">
            <i class="el-icon-reading"></i>
            读取批注
          </el-button>
        </div>
      </div>
    </div>

    <!-- 步骤2：读取批注 -->
    <div v-show="currentStep === 2" class="panel">
      <div class="panel-header">
        <span><i class="el-icon-reading"></i> 步骤2：读取批注</span>
        <div>
          <el-button size="small" icon="el-icon-document-copy" @click="copyAnnotations">
            复制全部
          </el-button>
          <el-button size="small" icon="el-icon-back" @click="goToStep(1)">
            重新上传
          </el-button>
        </div>
      </div>
      <div class="panel-body">
        <el-table :data="annotations" border stripe v-loading="loading">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="author" label="作者" width="120" />
          <el-table-column prop="content" label="批注内容" min-width="300" />
          <el-table-column label="数据获取方式" width="180">
            <template slot-scope="scope">
              <el-select v-model="scope.row.dataSource" placeholder="请选择" size="small">
                <el-option label="手动输入" value="manual" />
                <el-option label="API接口" value="api" />
                <el-option label="公式计算" value="formula" />
                <el-option label="历史数据" value="history" />
                <el-option label="待确认" value="pending" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template slot-scope="scope">
              <el-button type="text" size="small" @click="removeAnnotation(scope.$index)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="annotations.length === 0 && !loading" class="empty-annotations">
          <i class="el-icon-document-delete"></i>
          <p>未检测到批注，请确认文档中是否添加了批注</p>
        </div>

        <div v-if="annotations.length > 0" class="step-action">
          <el-button type="primary" size="large" @click="goToStep(3)">
            <i class="el-icon-right"></i>
            下一步：记录获取方式
          </el-button>
        </div>
      </div>
    </div>

    <!-- 步骤3：记录数据获取方式 -->
    <div v-show="currentStep === 3" class="panel">
      <div class="panel-header">
        <span><i class="el-icon-edit-outline"></i> 步骤3：记录获取方式 & 生成文档</span>
        <div>
          <el-button size="small" icon="el-icon-back" @click="goToStep(2)">
            返回修改
          </el-button>
          <el-button size="small" type="warning" icon="el-icon-document" @click="generateAndEdit" :loading="generating">
            <i class="el-icon-magic-stick"></i>
            AI生成文档
          </el-button>
          <el-button size="small" type="success" icon="el-icon-check" @click="saveAnnotationData">
            保存记录
          </el-button>
        </div>
      </div>
      <div class="panel-body">
        <!-- 生成进度 -->
        <div v-if="generating" class="generation-progress">
          <el-progress :percentage="generationProgress" :format="formatProgress" />
          <p class="progress-text">{{ generationStatus }}</p>
        </div>

        <!-- 文档内容预览 -->
        <div v-if="documentSections.length > 0" class="document-preview">
          <div class="preview-header">
            <i class="el-icon-document"></i>
            <span>文档内容预览</span>
            <el-button size="mini" type="text" @click="togglePreview">{{ showPreview ? '收起' : '展开' }}</el-button>
          </div>
          <div v-show="showPreview" class="preview-content">
            <div v-for="(section, index) in documentSections" :key="index" class="section-item">
              <div :class="['section-title', 'level-' + section.level]">
                <span class="section-number">{{ getSectionNumber(section.level) }}</span>
                <span>{{ section.title }}</span>
              </div>
              <div v-if="section.content" class="section-content">
                {{ truncateContent(section.content) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value">{{ annotations.length }}</div>
            <div class="stat-label">批注总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getSourceCount('manual') }}</div>
            <div class="stat-label">手动输入</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getSourceCount('api') }}</div>
            <div class="stat-label">API接口</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getSourceCount('formula') }}</div>
            <div class="stat-label">公式计算</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getSourceCount('history') }}</div>
            <div class="stat-label">历史数据</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ getSourceCount('pending') }}</div>
            <div class="stat-label">待确认</div>
          </div>
        </div>

        <!-- 批注列表（可编辑） -->
        <el-table :data="annotations" border stripe>
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="author" label="作者" width="120" />
          <el-table-column prop="content" label="批注内容" min-width="200" />
          <el-table-column label="数据获取方式" width="180">
            <template slot-scope="scope">
              <el-select v-model="scope.row.dataSource" placeholder="请选择" size="small">
                <el-option label="手动输入" value="manual" />
                <el-option label="API接口" value="api" />
                <el-option label="公式计算" value="formula" />
                <el-option label="历史数据" value="history" />
                <el-option label="待确认" value="pending" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="150">
            <template slot-scope="scope">
              <el-input
                v-model="scope.row.description"
                placeholder="备注说明"
                size="small"
              />
            </template>
          </el-table-column>
        </el-table>

        <div v-if="annotations.length > 0" class="save-tip">
          <i class="el-icon-info"></i>
          点击"保存记录"将数据保存到数据库，用于后续文档生成
        </div>
      </div>
    </div>

    <!-- 批注来源说明 -->
    <div class="source-guide">
      <h4><i class="el-icon-info"></i> 数据获取方式说明</h4>
      <ul>
        <li><strong>手动输入</strong>：需要人工填写的数据</li>
        <li><strong>API接口</strong>：通过系统接口自动获取的数据</li>
        <li><strong>公式计算</strong>：根据其他字段计算得出的数据</li>
        <li><strong>历史数据</strong>：从历史文档或数据库中引用的数据</li>
        <li><strong>待确认</strong>：尚未确定获取方式的数据</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { readAnnotationsApi, saveAnnotationDataApi, generateDocumentApi, readDocumentStructureApi } from '@/api/annotation'

export default {
  name: 'AnnotationExtract',
  data() {
    return {
      currentStep: 1,
      fileList: [],
      uploadedFile: null,
      annotations: [],
      documentSections: [],  // 文档章节结构
      loading: false,
      generating: false,
      generationProgress: 0,
      generationStatus: '准备生成...',
      showPreview: true  // 默认展开文档预览
    }
  },
  methods: {
    // 文件变化
    handleFileChange(file, fileList) {
      // 只保留最新上传的文件
      if (fileList.length > 1) {
        fileList = [fileList[fileList.length - 1]]
      }
      this.fileList = fileList
      this.uploadedFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    // 移除文件
    handleFileRemove() {
      this.fileList = []
      this.uploadedFile = null
      this.annotations = []
      this.documentSections = []
    },

    // 格式化文件大小
    formatFileSize(size) {
      if (!size) return ''
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
      return (size / (1024 * 1024)).toFixed(1) + ' MB'
    },

    // 切换步骤
    goToStep(step) {
      this.currentStep = step
    },

    // 读取批注和文档结构
    async readAnnotations() {
      if (!this.uploadedFile) {
        this.$message.warning('请先上传文档')
        return
      }

      this.loading = true
      try {
        const formData = new FormData()
        formData.append('file', this.uploadedFile.raw)

        // 同时读取批注和文档结构
        const [annotationsRes, structureRes] = await Promise.all([
          readAnnotationsApi(formData),
          readDocumentStructureApi(formData)
        ])

        if (annotationsRes.code === 0 || annotationsRes.code === 200) {
          this.annotations = annotationsRes.data || []
          // 为每个批注添加默认值
          this.annotations.forEach(item => {
            this.$set(item, 'dataSource', item.dataSource || 'pending')
            this.$set(item, 'description', item.description || '')
          })
          this.$message.success(`读取到 ${this.annotations.length} 条批注`)
        } else {
          this.$message.error(annotationsRes.message || '读取批注失败')
        }

        if (structureRes.code === 0 || structureRes.code === 200) {
          this.documentSections = structureRes.data || []
          this.$message.success(`读取到 ${this.documentSections.length} 个章节`)
        }

        this.currentStep = 2
      } catch (e) {
        console.error('读取失败', e)
        this.$message.error('读取失败')
      } finally {
        this.loading = false
      }
    },

    // 复制批注
    copyAnnotations() {
      if (this.annotations.length === 0) {
        this.$message.warning('暂无批注可复制')
        return
      }
      const text = this.annotations.map((item, index) =>
        `${index + 1}. [${item.author}]: ${item.content}`
      ).join('\n')
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制到剪贴板')
      })
    },

    // 删除批注
    removeAnnotation(index) {
      this.annotations.splice(index, 1)
    },

    // 获取指定来源的数量
    getSourceCount(source) {
      return this.annotations.filter(item => item.dataSource === source).length
    },

    // 切换文档预览显示
    togglePreview() {
      this.showPreview = !this.showPreview
    },

    // 获取章节编号
    getSectionNumber(level) {
      // 根据级别返回不同的前缀符号
      const prefixes = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五' }
      return prefixes[level] || level
    },

    // 截断内容（过长时显示省略）
    truncateContent(content, maxLength = 200) {
      if (!content) return ''
      if (content.length <= maxLength) return content
      return content.substring(0, maxLength) + '...'
    },

    // 保存批注数据
    async saveAnnotationData() {
      try {
        const res = await saveAnnotationDataApi({
          fileName: this.uploadedFile ? this.uploadedFile.name : '',
          annotations: this.annotations
        })
        if (res.code === 0 || res.code === 200) {
          this.$message.success('保存成功')
        } else {
          this.$message.error(res.message || '保存失败')
        }
      } catch (e) {
        console.error('保存失败', e)
        this.$message.error('保存失败')
      }
    },

    // 格式化进度
    formatProgress(percentage) {
      return percentage + '%'
    },

    // 生成文档并编辑（跳转到编辑器）- 流式版本
    async generateAndEdit() {
      if (!this.uploadedFile) {
        this.$message.warning('请先上传文档')
        return
      }

      if (this.annotations.length === 0) {
        this.$message.warning('请先读取批注')
        return
      }

      try {
        // 跳转到编辑器页面，传递必要的数据
        const editorData = {
          fileName: this.uploadedFile.name,
          annotations: this.annotations,
          isStreaming: true  // 标记为流式生成
        }
        sessionStorage.setItem('editorDocument', JSON.stringify(editorData))

        // 跳转到编辑器页面
        this.$router.push({
          name: 'ReportEditor',
          params: { fromGenerate: 'true' }
        })

        // 延迟启动 SSE，等待页面跳转完成
        setTimeout(() => {
          this.startStreamingGenerate()
        }, 800)

      } catch (e) {
        console.error('启动生成失败', e)
        this.$message.error('启动生成失败: ' + (e.message || '请检查网络连接'))
      }
    },

    // 启动流式生成
    async startStreamingGenerate() {
      const baseUrl = process.env.VUE_APP_BASE_API || '/api'
      const url = `${baseUrl}/v1/annotation/generate/stream`

      const formData = new FormData()
      formData.append('file', this.uploadedFile.raw)
      formData.append('annotations', JSON.stringify(this.annotations))

      try {
        this.generating = true
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                this.handleStreamEvent(data)
              } catch (e) {
                console.warn('解析SSE数据失败:', e)
              }
            }
          }
        }

        this.generating = false

      } catch (e) {
        console.error('流式生成失败:', e)
        this.generating = false
        this.$message.error('生成失败: ' + (e.message || '请检查网络连接'))
      }
    },

    // 处理SSE事件 - 通过 window 事件传递给 editor.vue
    handleStreamEvent(data) {
      console.log('[Generate] 收到SSE事件:', data)

      // 通过 window 事件传递给 editor.vue（同窗口不同页面通信）
      // 重要：按优先级判断，先判断最具体的条件

      // 1. 判断 chunk 事件 - 内容片段（逐字输出）
      if (data.index !== undefined && data.chunk !== undefined) {
        window.dispatchEvent(new CustomEvent('stream-chunk', {
          detail: { index: data.index, level: data.level, chunk: data.chunk, isEnd: data.isEnd, taskId: data.taskId }
        }))
      }
      // 2. 判断 section-start 事件 - 新章节开始（有 title 但没有 content）
      else if (data.index !== undefined && data.title !== undefined && data.content === undefined) {
        window.dispatchEvent(new CustomEvent('stream-section-start', {
          detail: { index: data.index, level: data.level, title: data.title, taskId: data.taskId }
        }))
      }
      // 3. 判断 section-end 事件 - 章节完成
      else if (data.index !== undefined && data.isEnd !== undefined && data.chunk === undefined && data.title === undefined) {
        window.dispatchEvent(new CustomEvent('stream-section-end', {
          detail: { index: data.index, level: data.level, isEnd: data.isEnd, taskId: data.taskId }
        }))
      }
      // 4. 判断 section 事件（完整章节数据）
      else if (data.index !== undefined && data.title !== undefined && data.content !== undefined) {
        window.dispatchEvent(new CustomEvent('stream-section', {
          detail: { index: data.index, level: data.level, title: data.title, content: data.content, taskId: data.taskId }
        }))
      }
      // 5. 判断 init 事件 - 初始化
      else if (data.totalSections !== undefined) {
        window.dispatchEvent(new CustomEvent('stream-init', {
          detail: { totalSections: data.totalSections, taskId: data.taskId }
        }))
      }
      // 6. 判断 complete 事件 - 生成完成（精确匹配，不模糊匹配）
      else if (data.type === 'complete' || data.code === 0 || data.code === 200) {
        window.dispatchEvent(new CustomEvent('stream-complete', {
          detail: { message: data.message || '文档生成完成', sections: data.sections }
        }))
      }
      // 7. 判断 error 事件 - 错误
      else if (data.type === 'error' || (data.code !== undefined && data.code !== 0 && data.code !== 200)) {
        window.dispatchEvent(new CustomEvent('stream-error', {
          detail: { message: data.message || '生成失败' }
        }))
      }
    },

    // Blob 转 base64
    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    },

    // 文件转 base64
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },

    // 生成文档（下载）
    async generateDocument() {
      if (!this.uploadedFile) {
        this.$message.warning('请先上传文档')
        return
      }

      if (this.annotations.length === 0) {
        this.$message.warning('请先读取批注')
        return
      }

      // 检查是否有批注设置了数据获取方式
      const unconfiguredCount = this.annotations.filter(a => !a.dataSource || a.dataSource === 'pending').length
      if (unconfiguredCount > 0) {
        await this.$confirm(
          `有 ${unconfiguredCount} 条批注未设置数据获取方式，将使用默认值。是否继续生成？`,
          '提示',
          { confirmButtonText: '继续生成', cancelButtonText: '取消', type: 'warning' }
        )
      }

      this.generating = true
      this.generationProgress = 0
      this.generationStatus = '正在调用大模型生成文档...'

      try {
        const formData = new FormData()
        formData.append('file', this.uploadedFile.raw)
        formData.append('annotations', JSON.stringify(this.annotations))

        this.generationProgress = 30
        this.generationStatus = '大模型正在处理文档结构...'

        const res = await generateDocumentApi(formData)

        this.generationProgress = 80
        this.generationStatus = '文档生成完成，准备下载...'

        // 处理响应 - 支持 blob 和普通响应
        let blob = null
        if (res instanceof Blob) {
          blob = res
        } else if (res.data instanceof Blob) {
          blob = res.data
        } else if (res && res.type === 'application/octet-stream') {
          blob = res
        }

        if (blob) {
          // 生成下载
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url

          // 从 Content-Disposition 获取文件名
          let fileName = this.uploadedFile.name.replace('.docx', '_generated.docx')
          if (res.headers && res.headers['content-disposition']) {
            const contentDisposition = res.headers['content-disposition']
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (match) {
              fileName = decodeURIComponent(match[1].replace(/['"]/g, ''))
            }
          }

          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          this.generationProgress = 100
          this.generationStatus = '文档生成成功！'
          this.$message.success('文档生成成功，已开始下载')
        } else {
          throw new Error('无效的响应格式')
        }

      } catch (e) {
        console.error('生成文档失败', e)
        this.$message.error('生成文档失败: ' + (e.message || '未知错误'))
        this.generationProgress = 0
        this.generationStatus = '生成失败'
      } finally {
        // 3秒后隐藏进度条
        setTimeout(() => {
          this.generating = false
        }, 3000)
      }
    }
  }
}
</script>

<style scoped>
.annotation-extract-container {
  padding: 20px;
  background: #f0f2f5;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
}

.step {
  display: flex;
  align-items: center;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8e8e8;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.step.active .step-number {
  background: #3D5FEF;
  color: #fff;
}

.step.completed .step-number {
  background: #52c41a;
  color: #fff;
}

.step-label {
  margin-left: 8px;
  color: #8c8c8c;
  font-size: 13px;
}

.step.active .step-label {
  color: #3D5FEF;
  font-weight: 500;
}

.step.completed .step-label {
  color: #52c41a;
}

.step-line {
  width: 80px;
  height: 2px;
  background: #e8e8e8;
  margin: 0 16px;
}

.step-line.active {
  background: #3D5FEF;
}

/* 面板 */
.panel {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin-bottom: 16px;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fafafa;
}

.panel-body {
  padding: 16px;
}

/* 上传区域 */
.upload-area {
  width: 100%;
}

.upload-area ::v-deep .el-upload-dragger {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  text-align: center;
}

.upload-content i {
  font-size: 67px;
  color: #C0C4CC;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-text em {
  color: #3D5FEF;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

/* 已上传文件 */
.uploaded-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 16px;
}

.word-icon {
  font-size: 32px;
  color: #3D5FEF;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

/* 空状态 */
.empty-annotations {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.empty-annotations i {
  font-size: 48px;
  margin-bottom: 16px;
}

/* 下一步按钮 */
.step-action {
  text-align: center;
  margin-top: 24px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

/* 生成进度 */
.generation-progress {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #91d5ff;
}

.generation-progress ::v-deep .el-progress {
  margin-bottom: 8px;
}

.progress-text {
  text-align: center;
  color: #1890ff;
  margin: 0;
  font-size: 13px;
}

/* 文档预览 */
.document-preview {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  font-size: 14px;
}

.preview-header i {
  margin-right: 8px;
  color: #3D5FEF;
}

.preview-header span {
  flex: 1;
}

.preview-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.section-item {
  margin-bottom: 16px;
}

.section-item:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.section-title.level-1 {
  font-size: 16px;
  color: #303133;
  border-left: 3px solid #3D5FEF;
  padding-left: 8px;
}

.section-title.level-2 {
  font-size: 14px;
  color: #606266;
}

.section-title.level-3 {
  font-size: 13px;
  color: #909399;
}

.section-number {
  margin-right: 8px;
  color: #909399;
  min-width: 20px;
}

.section-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding-left: 28px;
  background: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.stat-card {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 16px;
  text-align: center;
}

.stat-card.warning {
  background: #fff7e6;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #3D5FEF;
}

.stat-card.warning .stat-value {
  color: #fa8c16;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 保存提示 */
.save-tip {
  margin-top: 16px;
  padding: 12px;
  background: #e6f7ff;
  border-radius: 4px;
  color: #1890ff;
  font-size: 13px;
}

.save-tip i {
  margin-right: 8px;
}

/* 数据来源说明 */
.source-guide {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  padding: 16px;
}

.source-guide h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.source-guide h4 i {
  margin-right: 8px;
  color: #3D5FEF;
}

.source-guide ul {
  margin: 0;
  padding-left: 20px;
}

.source-guide li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.source-guide strong {
  color: #303133;
}
</style>
