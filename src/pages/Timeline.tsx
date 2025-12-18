import { useState, useRef, useEffect } from "react";
import { GanttChart } from "@/components/GanttChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { BarChart3, Filter, Download, Maximize2, Minimize2, Target, TrendingUp, Clock, FileImage, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useGanttChart } from "@/hooks/useGanttChart";
import { toast } from "@/hooks/use-toast";

export default function Timeline() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { ganttTasks, loading } = useGanttChart();

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!timelineRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (timelineRef.current.requestFullscreen) {
          await timelineRef.current.requestFullscreen();
        } else if ((timelineRef.current as any).webkitRequestFullscreen) {
          await (timelineRef.current as any).webkitRequestFullscreen();
        } else if ((timelineRef.current as any).msRequestFullscreen) {
          await (timelineRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode.",
        variant: "destructive",
      });
    }
  };

  // Export functionality
  const exportTimeline = async (format: 'png' | 'pdf' | 'excel' = 'png') => {
    setIsExporting(true);

    try {
      if (format === 'png') {
        await exportAsPNG();
      } else if (format === 'pdf') {
        await exportAsPDF();
      } else if (format === 'excel') {
        await exportAsExcel();
      }

      toast({
        title: "Export Successful",
        description: `Timeline exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export timeline. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export as PNG using html2canvas
  const exportAsPNG = async () => {
    const html2canvas = await import('html2canvas');
    const chartElement = timelineRef.current?.querySelector('[data-gantt-chart]') as HTMLElement || timelineRef.current;

    if (!chartElement) {
      throw new Error('Chart element not found');
    }

    const canvas = await html2canvas.default(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const link = document.createElement('a');
    link.download = `timeline-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export as PDF using jsPDF
  const exportAsPDF = async () => {
    const jsPDF = await import('jspdf');
    const html2canvas = await import('html2canvas');

    const chartElement = timelineRef.current?.querySelector('[data-gantt-chart]') as HTMLElement || timelineRef.current;

    if (!chartElement) {
      throw new Error('Chart element not found');
    }

    const canvas = await html2canvas.default(chartElement, {
      backgroundColor: '#ffffff',
      scale: 1,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF.jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`timeline-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export as Excel using xlsx
  const exportAsExcel = async () => {
    const XLSX = await import('xlsx');

    // Prepare data for Excel export
    const workbookData = ganttTasks.map(task => ({
      'Task Name': task.name,
      'Type': task.type,
      'Start Date': new Date(task.start_date).toLocaleDateString(),
      'End Date': new Date(task.end_date).toLocaleDateString(),
      'Duration': task.duration,
      'Progress': `${task.progress}%`,
      'Status': task.status,
      'Priority': task.priority,
      'Assignees': task.assignees?.length > 0 ? task.assignees.join(', ') : 'None',
      'Description': task.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Task Name
      { wch: 10 }, // Type
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 10 }, // Duration
      { wch: 10 }, // Progress
      { wch: 12 }, // Status
      { wch: 10 }, // Priority
      { wch: 20 }, // Assignees
      { wch: 40 }, // Description
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timeline Data');
    XLSX.writeFile(workbook, `timeline-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Calculate stats from ganttTasks
  const stats = {
    activeProjects: ganttTasks.filter(task => task.type === 'project' && task.status !== 'completed').length,
    onTrack: ganttTasks.filter(task => task.progress >= 50).length,
    overdue: ganttTasks.filter(task => new Date(task.end_date) < new Date() && task.progress < 100).length,
    avgProgress: ganttTasks.length > 0
      ? Math.round(ganttTasks.reduce((sum, task) => sum + task.progress, 0) / ganttTasks.length)
      : 0
  };

  return (
    <div
      ref={timelineRef}
      className={`space-y-8 animate-fade-in ${isFullscreen ? 'bg-white p-4 h-screen overflow-auto' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-primary" />
            Project Timeline
          </h1>
          <p className="text-muted-foreground text-lg">
            Visualize project progress, dependencies, and critical paths with interactive Gantt charts.
          </p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportTimeline('png')}>
                <FileImage className="h-4 w-4 mr-2" />
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportTimeline('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportTimeline('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 mr-2" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-2" />
            )}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      {/* Timeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{stats.activeProjects}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On Track</p>
              <p className="text-2xl font-bold">{stats.onTrack}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                <Badge variant="secondary" className="text-xs">avg</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm">Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-sm">Milestones</span>
        </div>
      </div>

      <div data-gantt-chart className="gantt-chart-container">
        <GanttChart height="calc(100vh - 500px)" showSidebar={true} />
      </div>
    </div>
  );
}
